"use client";

import {
  Activity,
  BarChart3,
  Coins,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import { AppPageShell } from "@/components/AppPageShell";
import { ScalarAppHeader } from "@/components/ScalarAppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useScalarAnalytics } from "@/hooks/useScalarAnalytics";
import { USDC_DECIMALS, isScalarConfigured } from "@/lib/scalar";
import { formatTokenAmount } from "@/utils/format";
import { cn } from "@/utils/cn";

// SCALAR: design enhancement — analytics dashboard (volume + fees from on-chain state; users from events)
export function ScalarAnalyticsPage() {
  const {
    totalVolume,
    activeMarkets,
    totalMarkets,
    platformFeesCollected,
    uniqueUsers,
    uniqueUsersFallback,
    uniqueUsersPending,
    isLoading,
  } = useScalarAnalytics();

  const statCards = [
    {
      label: "Unique users",
      value:
        uniqueUsersPending && !uniqueUsersFallback
          ? "…"
          : String(uniqueUsers),
      sub:
        uniqueUsersFallback
          ? "Creators (min.) — log scan unavailable"
          : "Wallets that created or bet",
      icon: Users,
      iconClass: "text-[#00f5ff]",
      accent: "from-[#00f5ff]/20 to-transparent",
      ring: "ring-[#00f5ff]/20",
    },
    {
      label: "Total betting volume",
      value: isLoading
        ? "…"
        : `${formatTokenAmount(totalVolume, USDC_DECIMALS, 2)} USDC`,
      sub: "Sum of all market pools",
      icon: Coins,
      iconClass: "text-[#a855f7]",
      accent: "from-[#a855f7]/15 to-transparent",
      ring: "ring-[#a855f7]/25",
    },
    {
      label: "Markets created",
      value: isLoading ? "…" : String(totalMarkets),
      sub: "All-time markets",
      icon: BarChart3,
      iconClass: "text-[#00f5ff]/85",
      accent: "from-[#00f5ff]/12 to-transparent",
      ring: "ring-cyan-500/15",
    },
    {
      label: "Active markets",
      value: isLoading ? "…" : String(activeMarkets),
      sub: "Open for trading now",
      icon: Activity,
      iconClass: "text-emerald-400/90",
      accent: "from-emerald-500/10 to-transparent",
      ring: "ring-emerald-500/15",
    },
    {
      label: "Platform fees collected",
      value: isLoading
        ? "…"
        : `${formatTokenAmount(platformFeesCollected, USDC_DECIMALS, 4)} USDC`,
      sub: "1.5% of pot at resolution (on-chain)",
      icon: Wallet,
      iconClass: "text-[#d8b4fe]",
      accent: "from-[#a855f7]/18 to-transparent",
      ring: "ring-violet-500/20",
    },
  ];

  return (
    <AppPageShell>
      <ScalarAppHeader />
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        {/* SCALAR: design enhancement — hero */}
        <header className="relative text-center">
          <div
            className="pointer-events-none absolute -inset-x-24 -top-16 h-48 bg-[radial-gradient(ellipse_at_center,rgba(0,245,255,0.12),transparent_65%)]"
            aria-hidden
          />
          <div className="relative inline-flex items-center gap-2 rounded-full border border-[#00f5ff]/20 bg-[#00f5ff]/[0.06] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-[#00f5ff]/90 shadow-[0_0_32px_-12px_rgba(0,245,255,0.35)]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Network pulse
          </div>
          <h1 className="relative mt-6 bg-gradient-to-br from-white via-zinc-100 to-zinc-400 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
            Analytics
          </h1>
          <p className="relative mx-auto mt-3 max-w-lg text-sm leading-relaxed text-zinc-500 sm:text-base">
            Live metrics from Scalar Market on Arc Testnet — refreshed as the
            chain moves.
          </p>
        </header>

        {!isScalarConfigured() ? (
          <p className="mx-auto mt-14 max-w-lg rounded-2xl border border-amber-900/40 bg-amber-950/25 px-4 py-4 text-center text-sm text-amber-100/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            Configure{" "}
            <code className="rounded bg-black/40 px-1.5 font-mono text-xs">
              NEXT_PUBLIC_SCALAR_MARKET_ADDRESS
            </code>{" "}
            to load analytics.
          </p>
        ) : (
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {statCards.map((card, i) => (
              <article
                key={card.label}
                style={{ animationDelay: `${i * 70}ms` }}
                className={cn(
                  "animate-scalar-fade-up group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/50 to-zinc-950/80 p-6 shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset]",
                  "transition-all duration-300 ease-out",
                  "hover:-translate-y-0.5 hover:border-[#00f5ff]/20 hover:shadow-[0_0_40px_-16px_rgba(0,245,255,0.2)]",
                  card.ring,
                  "ring-1",
                )}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100",
                    card.accent,
                  )}
                  aria-hidden
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-950/60 shadow-inner"
                    aria-hidden
                  >
                    <card.icon className={cn("h-5 w-5", card.iconClass)} />
                  </div>
                </div>
                <p className="relative mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  {card.label}
                </p>
                <p className="relative mt-2 text-2xl font-semibold tabular-nums tracking-tight text-white sm:text-[1.65rem]">
                  {card.value}
                </p>
                <p className="relative mt-2 text-xs leading-relaxed text-zinc-500">
                  {card.sub}
                </p>
              </article>
            ))}
          </div>
        )}

        <SiteFooter />
      </div>
    </AppPageShell>
  );
}
