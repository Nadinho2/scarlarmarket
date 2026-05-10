import { ImageResponse } from "next/og";
import { createPublicClient, http } from "viem";

import { SCALAR_MARKET_ADDRESS, scalarPredictionMarketAbi } from "@/lib/scalar";
import { formatAddress } from "@/utils/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

function getArcRpcUrl(): string {
  return (
    process.env.NEXT_PUBLIC_ARC_RPC_URL?.trim() || "https://rpc.testnet.arc.network"
  );
}

function truncate(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
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

function OgCard({
  title,
  category,
  creator,
  id,
}: {
  title: string;
  category: string;
  creator: string;
  id: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#0a0a0f",
        backgroundImage:
          "radial-gradient(900px 520px at 35% -10%, rgba(0,245,255,0.18), transparent 55%), radial-gradient(700px 420px at 110% 0%, rgba(168,85,247,0.14), transparent 55%)",
        color: "#e4e4e7",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      }}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 18,
            background:
              "linear-gradient(135deg, rgba(0,245,255,0.22), rgba(10,10,15,0.2))",
            border: "1px solid rgba(0,245,255,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "rgba(0,245,255,0.95)",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "rgba(0,245,255,0.88)",
            }}
          >
            Scalar Market
          </div>
          <div style={{ fontSize: 14, color: "rgba(161,161,170,0.95)" }}>
            Prediction markets on Arc
          </div>
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid rgba(0,245,255,0.28)",
              background: "rgba(0,245,255,0.06)",
              color: "rgba(0,245,255,0.9)",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {category || "Uncategorized"}
          </div>
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid rgba(168,85,247,0.32)",
              background: "rgba(168,85,247,0.08)",
              color: "rgba(216,180,254,0.95)",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Market #{id}
          </div>
        </div>

        <div
          style={{
            fontSize: 46,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -1.2,
            color: "#fafafa",
            maxWidth: 1020,
            whiteSpace: "pre-wrap",
          }}
        >
          {title}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 14, color: "rgba(113,113,122,1)" }}>
            Created by
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "rgba(228,228,231,0.98)",
            }}
          >
            {creator}
          </div>
        </div>

        <div
          style={{
            fontSize: 14,
            color: "rgba(161,161,170,0.95)",
            padding: "10px 14px",
            borderRadius: 14,
            border: "1px solid rgba(39,39,42,0.9)",
            background: "rgba(9,9,11,0.45)",
          }}
        >
          arc · usdc pools · resolve to win
        </div>
      </div>
    </div>
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let title = "Predict the future";
  let category = "Scalar";
  let creator = "0x0000...0000";

  if (id && /^\d+$/.test(id)) {
    try {
      const m = await fetchMarketSummary(BigInt(id));
      if (m.question) title = truncate(m.question, 120);
      if (m.category) category = truncate(m.category, 28);
      if (m.creator) creator = formatAddress(m.creator, 4);
    } catch {}
  }

  try {
    return new ImageResponse(
      <OgCard title={title} category={category} creator={creator} id={id} />,
      {
        width: size.width,
        height: size.height,
      },
    );
  } catch {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0f",
          color: "#e4e4e7",
          fontSize: 48,
          fontWeight: 700,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
        }}
      >
        Scalar Market
      </div>,
      {
        width: size.width,
        height: size.height,
      },
    );
  }
}
