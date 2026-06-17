"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Radio, Search } from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";

import { AppPageShell } from "@/components/AppPageShell";
import { ScalarAppHeader } from "@/components/ScalarAppHeader";
import { ScalarPolymarketCard } from "@/components/ScalarPolymarketCard";
import { SiteFooter } from "@/components/SiteFooter";
import { useAutoArcSwitch } from "@/hooks/useAutoArcSwitch";
import {
  useScalarMarkets,
  type ScalarMarketRow,
} from "@/hooks/useScalarMarkets";
import { useScalarMarketEvents } from "@/hooks/useScalarMarketEvents";
import {
  MARKET_CATEGORIES,
  isScalarConfigured,
  matchesMarketCategory,
} from "@/lib/scalar";
import { arcTestnet } from "@/lib/web3";
import { cn } from "@/utils/cn";

const CLOSING_SOON_SEC = 86400n; // SCALAR: 24h threshold for "Closing soon"

type FilterTab = "all" | "open" | "closing" | "awaiting" | "resolved";

// SCALAR: visual enhancement — layered hero, tactile filters, rich market grid
export function ScalarHomeMarkets() {
  const { chainId, isConnected } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();
  const wrongNetwork = isConnected && chainId !== arcTestnet.id;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useAutoArcSwitch();
  useScalarMarketEvents(isScalarConfigured() && !wrongNetwork);

  const [query, setQuery] = useState("");

  const { rows, now, isLoading } = useScalarMarkets();

  const tab = useMemo<FilterTab>(() => {
    const t = searchParams.get("tab")?.trim().toLowerCase();
    if (
      t === "all" ||
      t === "open" ||
      t === "closing" ||
      t === "awaiting" ||
      t === "resolved"
    )
      return t;
    return "all";
  }, [searchParams]);

  const category = useMemo(() => {
    const urlCategory = searchParams.get("category")?.trim();
    if (!urlCategory) return "";
    const canonical = MARKET_CATEGORIES.find(
      (c) => c.toLowerCase() === urlCategory.toLowerCase(),
    );
    return canonical ?? "";
  }, [searchParams]);

  function navigateFilters(next: { tab?: FilterTab; category?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.tab !== undefined) params.set("tab", next.tab);
    if (next.category !== undefined) {
      if (next.category) params.set("category", next.category);
      else params.delete("category");
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}#markets` : `${pathname}#markets`);
  }

  const trending = useMemo(() => {
    const stillTakingBets = (r: ScalarMarketRow) =>
      !r.market.resolved &&
      (now === undefined || now <= r.market.endTime);

    const primary = rows.filter(stillTakingBets).slice(0, 4);
    if (primary.length > 0) return primary;

    return rows.filter((r) => !r.market.resolved).slice(0, 4);
  }, [rows, now]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const m = r.market;
      if (category && !matchesMarketCategory(m.category, category))
        return false;
      if (q && !m.question.toLowerCase().includes(q)) return false;
      if (tab === "resolved") return m.resolved;
      if (tab === "awaiting")
        return !m.resolved && now !== undefined && now > m.endTime;
      if (tab === "all") return !m.resolved;
      if (tab === "open")
        return !m.resolved && (now === undefined || now <= m.endTime);
      if (tab === "closing") {
        if (m.resolved || now === undefined || now > m.endTime) return false;
        return m.endTime - now <= CLOSING_SOON_SEC;
      }
      return !m.resolved;
    });
  }, [rows, tab, category, query, now]);

  return (
    <AppPageShell>
      <ScalarAppHeader />
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        {wrongNetwork ? (
          <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-zinc-800/90 bg-zinc-950/60 px-4 py-4 shadow-[0_0_40px_-20px_rgba(0,0,0,0.5)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Radio className="h-4 w-4 text-zinc-500" aria-hidden />
              Switch to Arc Testnet to trade.
            </div>
            <button
              type="button"
              disabled={switching}
              onClick={() => switchChain?.({ chainId: arcTestnet.id })}
              className="rounded-xl border border-zinc-700/90 px-4 py-2.5 text-sm text-zinc-200 transition-all hover:border-[#00f5ff]/30 hover:shadow-[0_0_20px_-8px_rgba(0,245,255,0.2)] disabled:opacity-50"
            >
              {switching ? "…" : "Switch network"}
            </button>
          </div>
        ) : null}

        {!isScalarConfigured() ? (
          <p className="mb-10 rounded-xl border border-amber-900/35 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90">
            Set{" "}
            <code className="rounded bg-black/30 px-1 font-mono text-xs">
              NEXT_PUBLIC_SCALAR_MARKET_ADDRESS
            </code>{" "}
            in{" "}
            <code className="rounded bg-black/30 px-1 font-mono text-xs">
              .env.local
            </code>
            .
          </p>
        ) : null}

        {/* SCALAR: design enhancement — hero */}
        <header className="relative mx-auto max-w-2xl text-center">
          <div
            className="pointer-events-none absolute -inset-x-24 -top-16 h-48 bg-[radial-gradient(ellipse_at_center,rgba(0,245,255,0.11),transparent_68%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -inset-x-16 top-1/4 h-32 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.06),transparent_70%)]"
            aria-hidden
          />
          <p className="relative text-xs font-semibold uppercase tracking-[0.28em] text-[#00f5ff]/80">
            Scalar Market
          </p>
          <h1 className="relative mt-3 bg-gradient-to-br from-white via-zinc-100 to-zinc-500 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl sm:leading-[1.08]">
            Predict the future
          </h1>
          <p className="relative mt-4 text-base text-zinc-500 sm:text-lg">
            Bet on anything. Win with truth.
          </p>
          <div className="relative mt-11 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="#markets"
              className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-[#00f5ff] px-7 text-sm font-semibold text-[#0a0a0f] shadow-[0_0_36px_-6px_rgba(0,245,255,0.5)] transition-all duration-300 hover:border hover:border-[#00f5ff]/30 hover:shadow-[0_0_48px_-4px_rgba(0,245,255,0.55)]"
            >
              Browse markets
            </a>
            <Link
              href="/?category=NFTs&tab=all#markets"
              className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-[#a855f7]/35 bg-gradient-to-br from-[#a855f7]/15 via-zinc-950/40 to-zinc-950/70 px-7 text-sm font-semibold text-[#d8b4fe] shadow-[0_0_34px_-16px_rgba(168,85,247,0.55)] transition-all duration-300 hover:border-[#00f5ff]/25 hover:text-white hover:shadow-[0_0_44px_-16px_rgba(0,245,255,0.35)]"
            >
              Hottest NFT MARKET
            </Link>
            <Link
              href="/create"
              className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-zinc-700/90 bg-zinc-900/35 px-7 text-sm font-semibold text-zinc-200 transition-all duration-300 hover:border-[#a855f7]/35 hover:bg-zinc-900/60 hover:shadow-[0_0_32px_-12px_rgba(168,85,247,0.25)]"
            >
              Create new market
            </Link>
          </div>
          <p className="relative mx-auto mt-12 max-w-md text-sm leading-relaxed text-zinc-600">
            Parimutuel pools on Arc Testnet — USDC in, USDC out.
          </p>
        </header>

        {isScalarConfigured() ? (
          <section className="mt-16 sm:mt-20" aria-label="Trending markets">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Trending
              </h2>
              <Link
                href="#markets"
                className="text-xs font-medium text-zinc-600 transition-colors hover:text-[#00f5ff]/80"
              >
                All markets ↓
              </Link>
            </div>
            {isLoading ? (
              <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 [scrollbar-width:thin]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[300px] w-[min(100%,280px)] shrink-0 animate-pulse rounded-2xl bg-gradient-to-b from-zinc-900/50 to-zinc-950/30 ring-1 ring-zinc-800/70 sm:w-72"
                  />
                ))}
              </div>
            ) : trending.length === 0 ? (
              <p className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-12 text-center text-sm text-zinc-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
                No markets yet.{" "}
                <Link
                  href="/create"
                  className="font-semibold text-[#00f5ff]/85 underline-offset-4 hover:underline"
                >
                  Create the first
                </Link>
              </p>
            ) : (
              <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 [scrollbar-width:thin]">
                {trending.map((row) => (
                  <div
                    key={row.id.toString()}
                    className="w-[min(100%,280px)] shrink-0 sm:w-72"
                  >
                    <ScalarPolymarketCard row={row} now={now} />
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {/* SCALAR: visual enhancement — discovery */}
        <section id="markets" className="mt-16 scroll-mt-28 sm:mt-20">
          <div className="flex flex-col gap-6 border-b border-zinc-800/50 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              All markets
            </h2>
            <div className="relative max-w-md flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search questions…"
                className="w-full rounded-xl border border-zinc-800/90 bg-zinc-950/60 py-3 pl-11 pr-4 text-sm text-zinc-200 shadow-[inset_0_2px_8px_rgba(0,0,0,0.25)] placeholder:text-zinc-600 transition-colors focus:border-[#00f5ff]/35 focus:outline-none focus:ring-2 focus:ring-[#00f5ff]/15"
              />
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["open", "Open"],
                  ["closing", "Closing soon"],
                  ["awaiting", "Awaiting resolution"],
                  ["resolved", "Resolved"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => navigateFilters({ tab: key })}
                  className={cn(
                    "rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                    tab === key
                      ? "bg-[#00f5ff]/12 text-[#00f5ff] shadow-[0_0_28px_-8px_rgba(0,245,255,0.35)] ring-1 ring-[#00f5ff]/30"
                      : "bg-zinc-900/40 text-zinc-500 ring-1 ring-zinc-800/80 hover:text-zinc-200 hover:ring-zinc-700",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* SCALAR: design enhancement — category chips */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigateFilters({ category: "" })}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all duration-200",
                  category === ""
                    ? "bg-[#a855f7]/15 text-[#d8b4fe] ring-1 ring-[#a855f7]/35 shadow-[0_0_20px_-8px_rgba(168,85,247,0.35)]"
                    : "bg-zinc-900/50 text-zinc-500 ring-1 ring-zinc-800/80 hover:text-zinc-300",
                )}
              >
                All categories
              </button>
              {MARKET_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => navigateFilters({ category: c })}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200",
                    category === c
                      ? "bg-[#00f5ff]/12 text-[#00f5ff] ring-1 ring-[#00f5ff]/35 shadow-[0_0_22px_-8px_rgba(0,245,255,0.35)]"
                      : "bg-zinc-900/50 text-zinc-500 ring-1 ring-zinc-800/80 hover:text-zinc-300",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {isLoading && isScalarConfigured() ? (
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-2xl bg-gradient-to-b from-zinc-900/50 to-zinc-950/30 ring-1 ring-zinc-800/70"
                />
              ))}
            </div>
          ) : null}

          {!isLoading && isScalarConfigured() && filtered.length === 0 ? (
            <p className="mt-16 text-center text-sm text-zinc-500">
              No markets match.{" "}
              <Link
                href="/create"
                className="font-semibold text-[#00f5ff]/85 underline-offset-4 hover:underline"
              >
                Create one
              </Link>
              .
            </p>
          ) : null}

          {!isLoading && isScalarConfigured() && filtered.length > 0 ? (
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((row) => (
                <ScalarPolymarketCard
                  key={row.id.toString()}
                  row={row}
                  now={now}
                />
              ))}
            </div>
          ) : null}
        </section>

        <SiteFooter />
      </div>
    </AppPageShell>
  );
}
