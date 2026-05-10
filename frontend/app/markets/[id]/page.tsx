import type { Metadata } from "next";
import { createPublicClient, http } from "viem";

import { AppPageShell } from "@/components/AppPageShell";
import { ScalarAppHeader } from "@/components/ScalarAppHeader";
import { ScalarMarketDetail } from "@/components/ScalarMarketDetail";
import { SCALAR_MARKET_ADDRESS, scalarPredictionMarketAbi } from "@/lib/scalar";

// SCALAR: dynamic market route — bigint id from path
type PageProps = {
  params: Promise<{ id: string }>;
};

function getBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return (raw || "http://localhost:3000").replace(/\/$/, "");
}

function getArcRpcUrl(): string {
  return (
    process.env.NEXT_PUBLIC_ARC_RPC_URL?.trim() || "https://rpc.testnet.arc.network"
  );
}

async function fetchMarketSummary(marketId: bigint): Promise<{
  question?: string;
  category?: string;
  creator?: string;
}> {
  const client = createPublicClient({
    transport: http(getArcRpcUrl()),
  });
  const res = await client.readContract({
    address: SCALAR_MARKET_ADDRESS,
    abi: scalarPredictionMarketAbi,
    functionName: "getMarket",
    args: [marketId],
  });

  if (Array.isArray(res)) {
    return {
      question: typeof res[0] === "string" ? res[0] : undefined,
      category: typeof res[2] === "string" ? res[2] : undefined,
      creator: typeof res[3] === "string" ? res[3] : undefined,
    };
  }

  if (res && typeof res === "object") {
    const r = res as Record<string, unknown>;
    return {
      question: typeof r.question === "string" ? r.question : undefined,
      category: typeof r.category === "string" ? r.category : undefined,
      creator: typeof r.creator === "string" ? r.creator : undefined,
    };
  }

  return {};
}

function truncateForMeta(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { id } = await props.params;
  const baseUrl = getBaseUrl();
  const ogImage = `${baseUrl}/markets/${encodeURIComponent(id)}/opengraph-image`;

  let title = "Scalar Market";
  let description = "Prediction markets on Arc Testnet.";

  if (/^\d+$/.test(id)) {
    try {
      const m = await fetchMarketSummary(BigInt(id));
      if (m.question) {
        title = truncateForMeta(m.question, 68);
        description = truncateForMeta(m.question, 160);
      }
    } catch {}
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${baseUrl}/markets/${encodeURIComponent(id)}`,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function MarketByIdPage(props: PageProps) {
  const { id: idStr } = await props.params;

  if (!idStr || !/^\d+$/.test(idStr)) {
    return (
      <AppPageShell>
        <ScalarAppHeader />
        <p className="mx-auto max-w-6xl px-4 py-20 text-sm text-zinc-500">
          Invalid market id.
        </p>
      </AppPageShell>
    );
  }

  return <ScalarMarketDetail marketId={BigInt(idStr)} />;
}
