"use client";

import { useParams } from "next/navigation";

import { AppPageShell } from "@/components/AppPageShell";
import { ScalarAppHeader } from "@/components/ScalarAppHeader";
import { ScalarMarketDetail } from "@/components/ScalarMarketDetail";

// SCALAR: dynamic market route — bigint id from path
export default function MarketByIdPage() {
  const params = useParams();
  const raw = params?.id;
  const idStr = Array.isArray(raw) ? raw[0] : raw;

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
