"use client";

import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";

import { AppPageShell } from "@/components/AppPageShell";
import { ScalarAppHeader } from "@/components/ScalarAppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TransactionButton } from "@/components/TransactionButton";
import { useScalarMarkets, type ScalarMarketRow } from "@/hooks/useScalarMarkets";
import { useScalarMarketEvents } from "@/hooks/useScalarMarketEvents";
import {
  SCALAR_MARKET_ADDRESS,
  USDC_DECIMALS,
  computePendingPayout,
  isScalarConfigured,
  scalarPredictionMarketAbi,
} from "@/lib/scalar";
import { arcTestnet, wagmiConfig } from "@/lib/web3";
import { formatTokenAmount } from "@/utils/format";
import { toastTxError, toastTxSuccess } from "@/utils/toastTx";
import { cn } from "@/utils/cn";

function hasStake(r: ScalarMarketRow) {
  return r.userYes > 0n || r.userNo > 0n;
}

// SCALAR: design enhancement — portfolio stats, active / claims / history cards
export function ScalarPortfolioPage() {
  const { address, chainId, isConnected } = useAccount();
  const wrongNetwork = isConnected && chainId !== arcTestnet.id;

  useScalarMarketEvents(isScalarConfigured() && !wrongNetwork);

  const { rows, now, isLoading, refetchAll } = useScalarMarkets();
  const { writeContractAsync } = useWriteContract();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const enriched = useMemo(() => {
    return rows
      .filter((r) => hasStake(r))
      .map((r) => {
        const payout = computePendingPayout(
          {
            resolved: r.market.resolved,
            outcomeIsYes: r.market.outcomeIsYes,
            totalYes: r.market.totalYes,
            totalNo: r.market.totalNo,
          },
          r.userYes,
          r.userNo,
          r.claimed,
        );
        return { row: r, payout };
      });
  }, [rows]);

  const portfolioStats = useMemo(() => {
    let totalStaked = 0n;
    let resolvedWithStake = 0;
    let wins = 0;
    for (const x of enriched) {
      const stake = x.row.userYes + x.row.userNo;
      totalStaked += stake;
      if (!x.row.market.resolved || stake === 0n) continue;
      resolvedWithStake++;
      const m = x.row.market;
      const won =
        (m.outcomeIsYes && x.row.userYes > 0n) ||
        (!m.outcomeIsYes && x.row.userNo > 0n);
      if (won) wins++;
    }
    const winRate =
      resolvedWithStake > 0
        ? Math.round((wins / resolvedWithStake) * 1000) / 10
        : null;
    return { totalStaked, winRate, resolvedWithStake };
  }, [enriched]);

  const active = enriched.filter(
    (x) => !x.row.market.resolved && hasStake(x.row),
  );
  const claimable = enriched.filter(
    (x) =>
      x.row.market.resolved &&
      x.payout > 0n &&
      !x.row.claimed,
  );
  const history = enriched.filter(
    (x) =>
      x.row.market.resolved &&
      (x.row.claimed || x.payout === 0n),
  );

  async function claim(marketId: bigint) {
    if (!address || wrongNetwork) return;
    setClaimingId(marketId.toString());
    try {
      const hash = await writeContractAsync({
        address: SCALAR_MARKET_ADDRESS,
        abi: scalarPredictionMarketAbi,
        functionName: "claimWinnings",
        args: [marketId],
        chainId: arcTestnet.id,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      toastTxSuccess("Claimed", hash);
      await refetchAll();
    } catch (e) {
      toastTxError(e, "Claim failed");
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <AppPageShell>
      <ScalarAppHeader />
      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#00f5ff]/15 to-zinc-900/80 ring-1 ring-[#00f5ff]/25 shadow-[0_0_28px_-10px_rgba(0,245,255,0.35)]">
              <TrendingUp className="h-5 w-5 text-[#00f5ff]" aria-hidden />
            </div>
            <div>
              <h1 className="bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
                Portfolio
              </h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                Active positions, claims, and resolved history.
              </p>
            </div>
          </div>
          {isConnected &&
          address &&
          isScalarConfigured() &&
          !wrongNetwork &&
          !isLoading &&
          enriched.length > 0 ? (
            <div className="grid w-full grid-cols-2 gap-3 sm:max-w-md sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-4 py-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Total staked
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-50">
                  {formatTokenAmount(portfolioStats.totalStaked, USDC_DECIMALS, 2)}
                  <span className="ml-1 text-xs font-medium text-zinc-500">
                    USDC
                  </span>
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-4 py-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Win rate
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-[#00f5ff]">
                  {portfolioStats.winRate !== null
                    ? `${portfolioStats.winRate}%`
                    : "—"}
                </p>
              </div>
              <div className="col-span-2 rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-4 py-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] sm:col-span-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Resolved bets
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-50">
                  {portfolioStats.resolvedWithStake}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {!isScalarConfigured() ? (
          <p className="mt-10 rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90">
            Configure{" "}
            <code className="rounded bg-black/30 px-1 font-mono text-xs">
              NEXT_PUBLIC_SCALAR_MARKET_ADDRESS
            </code>{" "}
            to load positions.
          </p>
        ) : null}

        {!isConnected || !address ? (
          <p className="mt-12 text-center text-sm text-zinc-500">
            Connect a wallet to see your portfolio.
          </p>
        ) : null}

        {wrongNetwork ? (
          <p className="mt-8 text-center text-sm text-red-200/80">
            Switch to Arc Testnet to manage positions.
          </p>
        ) : null}

        {isConnected && address && isScalarConfigured() && !wrongNetwork && isLoading ? (
          <div className="mt-12 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-zinc-800/70 bg-gradient-to-r from-zinc-900/40 to-zinc-950/30"
              />
            ))}
          </div>
        ) : null}

        {isConnected &&
        address &&
        isScalarConfigured() &&
        !wrongNetwork &&
        !isLoading &&
        enriched.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/30 to-zinc-950/50 py-16 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <p className="text-sm text-zinc-500">No positions yet.</p>
            <Link
              href="/"
              className="mt-4 inline-flex text-sm font-semibold text-[#00f5ff]/90 underline-offset-4 transition-colors hover:text-[#00f5ff] hover:underline"
            >
              Browse markets
            </Link>
          </div>
        ) : null}

        {isConnected &&
        address &&
        isScalarConfigured() &&
        !wrongNetwork &&
        !isLoading &&
        enriched.length > 0 ? (
          <div className="mt-12 space-y-14">
            <PortfolioSection title="Active">
              {active.length === 0 ? (
                <EmptyLine />
              ) : (
                <ul className="space-y-3">
                  {active.map(({ row }) => (
                    <PositionRow key={row.id.toString()} row={row} now={now} />
                  ))}
                </ul>
              )}
            </PortfolioSection>

            <PortfolioSection title="Claim winnings">
              {claimable.length === 0 ? (
                <EmptyLine />
              ) : (
                <ul className="space-y-3">
                  {claimable.map(({ row, payout }) => (
                    <li
                      key={row.id.toString()}
                      className="rounded-2xl border border-[#00f5ff]/25 bg-gradient-to-br from-[#00f5ff]/[0.08] to-zinc-950/50 p-5 shadow-[0_0_32px_-16px_rgba(0,245,255,0.25)] transition-shadow hover:shadow-[0_0_40px_-12px_rgba(0,245,255,0.35)]"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs uppercase tracking-wider text-zinc-600">
                            #{row.id.toString()}
                          </p>
                          <p className="mt-1 text-sm font-medium text-zinc-100 line-clamp-2">
                            {row.market.question}
                          </p>
                          <p className="mt-2 text-xs text-zinc-500">
                            Claimable{" "}
                            <span className="tabular-nums text-[#00f5ff]">
                              {formatTokenAmount(payout, USDC_DECIMALS, 4)} USDC
                            </span>
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                          <TransactionButton
                            variant="primary"
                            className="min-w-[160px]"
                            loading={claimingId === row.id.toString()}
                            onClick={() => void claim(row.id)}
                          >
                            Claim winnings
                          </TransactionButton>
                          <Link
                            href={`/markets/${row.id.toString()}`}
                            className="text-center text-xs text-zinc-500 hover:text-zinc-300"
                          >
                            Open market
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </PortfolioSection>

            <PortfolioSection title="Bet history">
              {history.length === 0 ? (
                <EmptyLine />
              ) : (
                <ul className="space-y-3">
                  {history.map(({ row, payout }) => (
                    <HistoryRow
                      key={row.id.toString()}
                      row={row}
                      impliedPayoutIfUnclaimed={payout}
                    />
                  ))}
                </ul>
              )}
            </PortfolioSection>
          </div>
        ) : null}

        <SiteFooter />
      </div>
    </AppPageShell>
  );
}

function PortfolioSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyLine() {
  return <p className="text-sm text-zinc-600">Nothing here.</p>;
}

function PositionRow({
  row,
  now,
}: {
  row: ScalarMarketRow;
  now: bigint | undefined;
}) {
  const m = row.market;
  const open =
    !m.resolved && now !== undefined && now <= m.endTime;
  return (
    <li className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/35 to-zinc-950/60 p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset] transition-all duration-200 hover:border-zinc-700/90 hover:shadow-[0_8px_32px_-20px_rgba(0,0,0,0.5)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-zinc-600">
            #{row.id.toString()} · {m.category || "General"}
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-100 line-clamp-2">
            {m.question}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Yes{" "}
            <span className="tabular-nums text-zinc-300">
              {formatTokenAmount(row.userYes, USDC_DECIMALS, 4)}
            </span>
            {" · "}No{" "}
            <span className="tabular-nums text-zinc-300">
              {formatTokenAmount(row.userNo, USDC_DECIMALS, 4)}
            </span>{" "}
            USDC
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-medium uppercase",
              open
                ? "bg-[#00f5ff]/10 text-[#00f5ff]/80"
                : "bg-amber-950/40 text-amber-200/70",
            )}
          >
            {now === undefined ? "…" : open ? "Open" : "Awaiting result"}
          </span>
          <Link
            href={`/markets/${row.id.toString()}`}
            className="text-xs text-[#00f5ff]/80 hover:underline"
          >
            Trade
          </Link>
        </div>
      </div>
    </li>
  );
}

function HistoryRow({
  row,
  impliedPayoutIfUnclaimed,
}: {
  row: ScalarMarketRow;
  impliedPayoutIfUnclaimed: bigint;
}) {
  const m = row.market;
  const won =
    (m.outcomeIsYes && row.userYes > 0n) ||
    (!m.outcomeIsYes && row.userNo > 0n);
  const label = !won
    ? "Lost"
    : row.claimed
      ? "Won · claimed"
      : impliedPayoutIfUnclaimed > 0n
        ? "Won · claim on market page"
        : "Won";

  return (
    <li className="rounded-2xl border border-zinc-800/70 bg-zinc-950/35 p-5 transition-colors hover:border-zinc-700/80 hover:bg-zinc-900/30">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
            #{row.id.toString()} · Outcome: {m.outcomeIsYes ? "Yes" : "No"}
          </p>
          <p className="mt-1 text-sm text-zinc-200 line-clamp-2">{m.question}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Stake Yes{" "}
            <span className="tabular-nums text-zinc-400">
              {formatTokenAmount(row.userYes, USDC_DECIMALS, 2)}
            </span>
            {" · "}No{" "}
            <span className="tabular-nums text-zinc-400">
              {formatTokenAmount(row.userNo, USDC_DECIMALS, 2)}
            </span>{" "}
            USDC
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span
            className={cn(
              "text-xs font-medium",
              won ? "text-emerald-400/90" : "text-zinc-500",
            )}
          >
            {label}
          </span>
          <Link
            href={`/markets/${row.id.toString()}`}
            className="mt-2 block text-xs text-zinc-500 hover:text-zinc-300"
          >
            View
          </Link>
        </div>
      </div>
    </li>
  );
}
