"use client";

import Link from "next/link";
import { Clock, Coins } from "lucide-react";

import type { ScalarMarketRow } from "@/hooks/useScalarMarkets";
import { USDC_DECIMALS } from "@/lib/scalar";
import { formatTokenAmount } from "@/utils/format";
import { cn } from "@/utils/cn";

type Props = {
  row: ScalarMarketRow;
  /** SCALAR: omit until first Arc block loads — avoids false "closed" from wrong clock */
  now?: bigint;
};

// SCALAR: design enhancement — market card with probability strip, volume, hover glow
export function ScalarPolymarketCard({ row, now }: Props) {
  const { market, id } = row;
  const total = market.totalYes + market.totalNo;
  const yesPct =
    total > 0n ? Number((market.totalYes * 10000n) / total) / 100 : 50;
  const noPct =
    total > 0n ? Number((market.totalNo * 10000n) / total) / 100 : 50;

  const open =
    !market.resolved &&
    now !== undefined &&
    now <= market.endTime;
  const ended =
    !market.resolved && now !== undefined && now > market.endTime;

  const timeLabel = market.resolved
    ? "Resolved"
    : now === undefined
      ? "…"
      : now >= market.endTime
        ? "Awaiting result"
        : formatTimeLeft(market.endTime, now);

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/45 to-zinc-950/85 p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset]",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:border-[#00f5ff]/30 hover:shadow-[0_0_40px_-10px_rgba(0,245,255,0.28),0_16px_48px_-28px_rgba(0,0,0,0.65)]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#00f5ff]/[0.08] via-transparent to-[#a855f7]/[0.06]" />
      </div>

      <div className="relative flex items-start justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {market.category || "General"}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            market.resolved && "bg-zinc-800/90 text-zinc-500",
            open && "bg-[#00f5ff]/12 text-[#00f5ff]/90 ring-1 ring-[#00f5ff]/20",
            ended && "bg-[#a855f7]/12 text-[#d8b4fe]/90 ring-1 ring-[#a855f7]/20",
          )}
        >
          {market.resolved
            ? market.outcomeIsYes
              ? "Yes"
              : "No"
            : now === undefined
              ? "…"
              : open
                ? "Open"
                : "Closed"}
        </span>
      </div>

      <h3 className="relative mt-3 min-h-[2.75rem] text-[15px] font-semibold leading-snug text-zinc-50 line-clamp-2">
        {market.question}
      </h3>

      {/* SCALAR: visual enhancement — probability strip with inline % */}
      <div className="relative mt-5 space-y-2">
        <div className="flex justify-between text-xs font-medium tabular-nums">
          <span className="text-[#00f5ff]/90">{yesPct.toFixed(1)}%</span>
          <span className="text-zinc-600">Implied</span>
          <span className="text-[#a855f7]/90">{noPct.toFixed(1)}%</span>
        </div>
        <div className="relative flex h-9 overflow-hidden rounded-lg bg-zinc-900/90 shadow-[inset_0_2px_8px_rgba(0,0,0,0.35)] ring-1 ring-zinc-800/80">
          <div
            className="relative flex items-center justify-center bg-gradient-to-b from-[#00f5ff]/45 to-[#00f5ff]/25 transition-[width] duration-500 ease-out"
            style={{ width: `${yesPct}%`, minWidth: yesPct > 0 ? "2rem" : 0 }}
          >
            {yesPct >= 14 ? (
              <span className="text-[11px] font-bold tabular-nums text-[#0a0a0f]/90 drop-shadow-sm">
                {yesPct.toFixed(0)}%
              </span>
            ) : null}
          </div>
          <div
            className="relative flex items-center justify-center bg-gradient-to-b from-[#a855f7]/35 to-[#a855f7]/18 transition-[width] duration-500 ease-out"
            style={{ width: `${noPct}%`, minWidth: noPct > 0 ? "2rem" : 0 }}
          >
            {noPct >= 14 ? (
              <span className="text-[11px] font-bold tabular-nums text-white/95 drop-shadow-sm">
                {noPct.toFixed(0)}%
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-zinc-800/50 pt-4 text-xs text-zinc-500">
        <span className="inline-flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            Volume
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-[#00f5ff]/55" aria-hidden />
            <span className="font-semibold tabular-nums text-zinc-200">
              {formatTokenAmount(total, USDC_DECIMALS, 2)}
            </span>
            <span className="text-zinc-500">USDC</span>
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 tabular-nums text-zinc-400">
          <Clock className="h-3.5 w-3.5 shrink-0 text-zinc-600" aria-hidden />
          {timeLabel}
        </span>
      </div>

      <Link
        href={`/markets/${id.toString()}`}
        className={cn(
          "relative mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200",
          open
            ? "bg-[#00f5ff] text-[#0a0a0f] shadow-[0_0_24px_-6px_rgba(0,245,255,0.45)] hover:bg-[#00f5ff]/92 hover:shadow-[0_0_28px_-4px_rgba(0,245,255,0.5)]"
            : "border border-zinc-700/90 bg-zinc-900/30 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800/40",
        )}
      >
        {open ? "Bet now" : "View market"}
      </Link>
    </article>
  );
}

function formatTimeLeft(endTime: bigint, now: bigint): string {
  if (now >= endTime) return "Ended";
  const sec = Number(endTime - now);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}
