"use client";

import { CircleDollarSign } from "lucide-react";
import { useAccount, useReadContract } from "wagmi";

import { USDC_DECIMALS, scalarUsdc } from "@/lib/scalar";
import { arcTestnet } from "@/lib/web3";
import { formatTokenAmount } from "@/utils/format";
import { cn } from "@/utils/cn";

// SCALAR: design enhancement — USDC balance with icon + label (Arc Testnet)
export function UsdcBalanceBadge({ className }: { className?: string }) {
  const { address, chainId, isConnected } = useAccount();
  const onArc = isConnected && chainId === arcTestnet.id;

  const { data: raw, isLoading } = useReadContract({
    ...scalarUsdc,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && onArc,
      refetchInterval: 15_000,
    },
  });

  if (!isConnected || !onArc) return null;

  const bal =
    typeof raw === "bigint" ? formatTokenAmount(raw, USDC_DECIMALS, 2) : "—";

  return (
    <div
      className={cn(
        "flex max-w-[11rem] items-center gap-2 rounded-xl border border-zinc-800/90 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 px-2.5 py-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_0_24px_-12px_rgba(0,245,255,0.08)] transition-all duration-300 hover:border-[#00f5ff]/25 hover:shadow-[0_0_28px_-4px_rgba(0,245,255,0.18)] sm:max-w-none sm:gap-2.5 sm:px-3.5",
        className,
      )}
      title="USDC balance on Arc Testnet"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#00f5ff]/10 ring-1 ring-[#00f5ff]/25">
        <CircleDollarSign
          className="h-4 w-4 text-[#00f5ff] sm:h-[1.125rem] sm:w-[1.125rem]"
          aria-hidden
        />
      </div>
      <div className="min-w-0 flex flex-col">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Balance
        </span>
        {isLoading ? (
          <span className="h-4 w-20 animate-pulse rounded bg-zinc-800/80 sm:w-24" />
        ) : (
          <span className="truncate text-sm font-semibold tabular-nums tracking-tight text-zinc-50">
            {bal}{" "}
            <span className="font-medium text-[#00f5ff]/90">USDC</span>
          </span>
        )}
      </div>
    </div>
  );
}
