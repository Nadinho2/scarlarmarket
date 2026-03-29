"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { parseAbiItem, parseUnits } from "viem";
import { simulateContract, waitForTransactionReceipt } from "wagmi/actions";

import { AppPageShell } from "@/components/AppPageShell";
import { ScalarAppHeader } from "@/components/ScalarAppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TransactionButton } from "@/components/TransactionButton";
import { useScalarChainNow, useScalarMarketOwner } from "@/hooks/useScalarMarkets";
import { useScalarMarketEvents } from "@/hooks/useScalarMarketEvents";
import {
  SCALAR_MARKET_ADDRESS,
  USDC_DECIMALS,
  computePendingPayout,
  isScalarConfigured,
  scalarPredictionMarketAbi,
  scalarUsdc,
} from "@/lib/scalar";
import { arcTestnet, wagmiConfig } from "@/lib/web3";
import { formatAddress, formatTokenAmount } from "@/utils/format";
import { toastTxError, toastTxSuccess } from "@/utils/toastTx";
import { cn } from "@/utils/cn";

type BetLog = {
  user: `0x${string}`;
  isYes: boolean;
  usdcAmount: bigint;
};

const betPlacedEvent = parseAbiItem(
  "event BetPlaced(uint256 indexed marketId, address indexed user, bool isYes, uint256 usdcAmount)",
);

type Props = {
  marketId: bigint;
};

// SCALAR: design enhancement — pot metrics, probability bars, large USDC stake input, YES/NO panels
export function ScalarMarketDetail({ marketId }: Props) {
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: arcTestnet.id });
  const now = useScalarChainNow();
  const wrongNetwork = isConnected && chainId !== arcTestnet.id;

  useScalarMarketEvents(isScalarConfigured() && !wrongNetwork);

  const { data: market, refetch: refetchMarket } = useReadContract({
    address: SCALAR_MARKET_ADDRESS,
    abi: scalarPredictionMarketAbi,
    functionName: "getMarket",
    args: [marketId],
    query: { enabled: isScalarConfigured() },
  });

  const { data: userBet, refetch: refetchBet } = useReadContract({
    address: SCALAR_MARKET_ADDRESS,
    abi: scalarPredictionMarketAbi,
    functionName: "getUserBet",
    args: address && isScalarConfigured() ? [marketId, address] : undefined,
    query: {
      enabled: !!address && isScalarConfigured(),
    },
  });

  const { data: claimed, refetch: refetchClaimed } = useReadContract({
    address: SCALAR_MARKET_ADDRESS,
    abi: scalarPredictionMarketAbi,
    functionName: "claimed",
    args: address && isScalarConfigured() ? [marketId, address] : undefined,
    query: { enabled: !!address && isScalarConfigured() },
  });

  const { data: contractOwner } = useScalarMarketOwner();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    ...scalarUsdc,
    functionName: "allowance",
    args:
      address && isScalarConfigured()
        ? [address, SCALAR_MARKET_ADDRESS]
        : undefined,
    query: {
      enabled: !!address && isScalarConfigured(),
      refetchInterval: 10_000,
    },
  });

  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState<
    "approve" | "yes" | "no" | "resolveY" | "resolveN" | "claim" | null
  >(null);
  const [recent, setRecent] = useState<BetLog[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  const { writeContractAsync } = useWriteContract();

  const loadRecent = useCallback(async () => {
    if (!isScalarConfigured() || !publicClient) return;
    setRecentLoading(true);
    try {
      const latest = await publicClient.getBlockNumber();
      const from = latest > 4000n ? latest - 4000n : 0n;
      const logs = await publicClient.getLogs({
        address: SCALAR_MARKET_ADDRESS,
        event: betPlacedEvent,
        args: { marketId },
        fromBlock: from,
        toBlock: latest,
      });
      const parsed: BetLog[] = logs
        .map((l) => ({
          user: l.args.user as `0x${string}`,
          isYes: l.args.isYes as boolean,
          usdcAmount: l.args.usdcAmount as bigint,
        }))
        .reverse()
        .slice(0, 12);
      setRecent(parsed);
    } catch {
      setRecent([]);
    } finally {
      setRecentLoading(false);
    }
  }, [marketId, publicClient]);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  if (!isScalarConfigured()) {
    return (
      <AppPageShell>
        <ScalarAppHeader />
        <p className="mx-auto max-w-6xl px-4 py-20 text-sm text-zinc-500">
          Market contract not configured.
        </p>
      </AppPageShell>
    );
  }

  if (market === undefined) {
    return (
      <AppPageShell>
        <ScalarAppHeader />
        <div className="mx-auto max-w-6xl px-4 py-20">
          {/* SCALAR: visual enhancement — loading skeleton */}
          <div className="h-56 animate-pulse rounded-2xl bg-gradient-to-b from-zinc-900/60 to-zinc-950/40 ring-1 ring-zinc-800/60" />
        </div>
      </AppPageShell>
    );
  }

  const m = market as {
    question: string;
    endTime: bigint;
    category: string;
    resolved: boolean;
    outcomeIsYes: boolean;
    totalYes: bigint;
    totalNo: bigint;
  };

  const yesAmt =
    userBet && Array.isArray(userBet) ? (userBet[0] as bigint) : 0n;
  const noAmt =
    userBet && Array.isArray(userBet) ? (userBet[1] as bigint) : 0n;
  const claimedFlag = typeof claimed === "boolean" ? claimed : false;

  const payout = computePendingPayout(
    {
      resolved: m.resolved,
      outcomeIsYes: m.outcomeIsYes,
      totalYes: m.totalYes,
      totalNo: m.totalNo,
    },
    yesAmt,
    noAmt,
    claimedFlag,
  );

  const totalPot = m.totalYes + m.totalNo;
  const yesPct =
    totalPot > 0n ? Number((m.totalYes * 10000n) / totalPot) / 100 : 50;
  const noPct =
    totalPot > 0n ? Number((m.totalNo * 10000n) / totalPot) / 100 : 50;
  // SCALAR: design enhancement — 1.5% platform fee at resolution (matches `PLATFORM_FEE_BPS`)
  const estPlatformFee =
    totalPot > 0n ? (totalPot * 150n) / 10000n : 0n;
  const winnerPoolEst =
    totalPot > estPlatformFee ? totalPot - estPlatformFee : 0n;

  const canBet =
    isConnected &&
    !wrongNetwork &&
    !m.resolved &&
    now !== undefined &&
    now <= m.endTime;

  const isOwner =
    !!address &&
    typeof contractOwner === "string" &&
    address.toLowerCase() === contractOwner.toLowerCase();

  let amountWei: bigint | null = null;
  try {
    if (amount) amountWei = parseUnits(amount, USDC_DECIMALS);
  } catch {
    amountWei = null;
  }
  const invalid = !amountWei || amountWei === 0n;
  const allowanceB = typeof allowance === "bigint" ? allowance : 0n;
  const needsApprove =
    canBet && !invalid && allowanceB < amountWei!;

  async function approveBet() {
    if (!address || amountWei === null) return;
    setBusy("approve");
    try {
      const hash = await writeContractAsync({
        ...scalarUsdc,
        functionName: "approve",
        args: [SCALAR_MARKET_ADDRESS, amountWei],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      toastTxSuccess("Approved", hash);
      await refetchAllowance();
    } catch (e) {
      toastTxError(e, "Approve failed");
    } finally {
      setBusy(null);
    }
  }

  async function placeBet(isYes: boolean) {
    if (!address || invalid || needsApprove) {
      if (needsApprove)
        toastTxError(new Error("approve"), "Approve USDC for this amount first");
      return;
    }
    setBusy(isYes ? "yes" : "no");
    try {
      await simulateContract(wagmiConfig, {
        address: SCALAR_MARKET_ADDRESS,
        abi: scalarPredictionMarketAbi,
        functionName: "bet",
        args: [marketId, isYes, amountWei!],
        account: address,
      });
      const hash = await writeContractAsync({
        address: SCALAR_MARKET_ADDRESS,
        abi: scalarPredictionMarketAbi,
        functionName: "bet",
        args: [marketId, isYes, amountWei!],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      toastTxSuccess(isYes ? "Yes position placed" : "No position placed", hash);
      setAmount("");
      await refetchMarket();
      await refetchBet();
      await refetchAllowance();
      void loadRecent();
    } catch (e) {
      toastTxError(e, "Bet failed");
    } finally {
      setBusy(null);
    }
  }

  async function claim() {
    if (!address || payout === 0n || wrongNetwork) return;
    setBusy("claim");
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
      await refetchBet();
      await refetchClaimed();
      await refetchMarket();
    } catch (e) {
      toastTxError(e, "Claim failed");
    } finally {
      setBusy(null);
    }
  }

  async function resolve(winYes: boolean) {
    if (!address || !isOwner || wrongNetwork) return;
    setBusy(winYes ? "resolveY" : "resolveN");
    try {
      const hash = await writeContractAsync({
        address: SCALAR_MARKET_ADDRESS,
        abi: scalarPredictionMarketAbi,
        functionName: "resolveMarket",
        args: [marketId, winYes],
        chainId: arcTestnet.id,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      toastTxSuccess("Market resolved", hash);
      await refetchMarket();
    } catch (e) {
      toastTxError(e, "Resolve failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppPageShell>
      <ScalarAppHeader />
      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-20 pt-10 sm:px-6">
        <Link
          href="/"
          className="inline-flex text-xs font-medium text-zinc-500 transition-colors hover:text-[#00f5ff]/90"
        >
          ← Markets
        </Link>

        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
          {m.category || "General"} · #{marketId.toString()}
        </p>
        <h1 className="mt-3 text-2xl font-semibold leading-[1.25] tracking-tight text-white sm:text-3xl sm:leading-tight">
          {m.question}
        </h1>

        {/* SCALAR: design enhancement — market metrics + pot breakdown */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/40 to-zinc-950/70 p-6 shadow-[0_0_48px_-20px_rgba(0,245,255,0.15)] ring-1 ring-white/[0.05]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Total pot
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-white">
                {formatTokenAmount(totalPot, USDC_DECIMALS, 2)}{" "}
                <span className="text-base font-medium text-[#00f5ff]/80">USDC</span>
              </p>
            </div>
            <p className="text-right text-sm text-zinc-500">
              {m.resolved
                ? m.outcomeIsYes
                  ? "Outcome: Yes"
                  : "Outcome: No"
                : now === undefined
                  ? "Syncing time…"
                  : now > m.endTime
                    ? "Trading closed"
                    : `Ends ${new Date(Number(m.endTime) * 1000).toLocaleString()}`}
            </p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:text-sm">
            <div className="rounded-xl border border-[#00f5ff]/20 bg-[#00f5ff]/[0.06] px-4 py-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#00f5ff]/75">
                Yes pool
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-50">
                {formatTokenAmount(m.totalYes, USDC_DECIMALS, 2)}{" "}
                <span className="text-xs font-medium text-zinc-400">USDC</span>
              </p>
            </div>
            <div className="rounded-xl border border-[#a855f7]/25 bg-[#a855f7]/[0.07] px-4 py-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#c4b5fd]/90">
                No pool
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-50">
                {formatTokenAmount(m.totalNo, USDC_DECIMALS, 2)}{" "}
                <span className="text-xs font-medium text-zinc-400">USDC</span>
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm font-medium tabular-nums">
              <span className="text-[#00f5ff]/90">Yes {yesPct.toFixed(1)}%</span>
              <span className="text-zinc-600">Implied odds</span>
              <span className="text-[#a855f7]/90">No {noPct.toFixed(1)}%</span>
            </div>
            <div className="flex h-14 overflow-hidden rounded-xl bg-zinc-900/90 shadow-[inset_0_2px_12px_rgba(0,0,0,0.4)] ring-1 ring-zinc-800/90">
              <div
                className="flex items-center justify-center bg-gradient-to-b from-[#00f5ff]/50 to-[#00f5ff]/28 transition-[width] duration-500"
                style={{ width: `${yesPct}%`, minWidth: yesPct > 0 ? "3rem" : 0 }}
              >
                {yesPct >= 12 ? (
                  <span className="text-sm font-bold tabular-nums text-[#0a0a0f]">
                    {yesPct.toFixed(0)}%
                  </span>
                ) : null}
              </div>
              <div
                className="flex items-center justify-center bg-gradient-to-b from-[#a855f7]/40 to-[#a855f7]/22 transition-[width] duration-500"
                style={{ width: `${noPct}%`, minWidth: noPct > 0 ? "3rem" : 0 }}
              >
                {noPct >= 12 ? (
                  <span className="text-sm font-bold tabular-nums text-white">
                    {noPct.toFixed(0)}%
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          {!m.resolved && totalPot > 0n ? (
            <div className="mt-6 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4 text-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Pot breakdown at resolution
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-zinc-500">Platform fee (1.5%)</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums text-zinc-100">
                    {formatTokenAmount(estPlatformFee, USDC_DECIMALS, 2)}{" "}
                    <span className="text-sm font-medium text-zinc-500">USDC</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Winner pool (after fee)</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums text-[#00f5ff]/90">
                    {formatTokenAmount(winnerPoolEst, USDC_DECIMALS, 2)}{" "}
                    <span className="text-sm font-medium text-zinc-500">USDC</span>
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* SCALAR: design enhancement — large stake input + outcome panels */}
        {canBet ? (
          <div className="mt-10 space-y-5">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Bet amount
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-2xl border border-zinc-800/90 bg-zinc-950/70 py-4 pl-5 pr-[5.25rem] text-2xl font-semibold tabular-nums text-white shadow-[inset_0_2px_12px_rgba(0,0,0,0.3)] placeholder:text-zinc-600 transition-colors focus:border-[#00f5ff]/40 focus:outline-none focus:ring-2 focus:ring-[#00f5ff]/18 sm:text-3xl sm:py-[1.125rem]"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-lg bg-gradient-to-br from-[#00f5ff]/15 to-zinc-900/80 px-3 py-1.5 text-xs font-bold tracking-wider text-[#00f5ff] ring-1 ring-[#00f5ff]/30">
                USDC
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div
                className={cn(
                  "group/panel rounded-2xl border border-[#00f5ff]/25 bg-gradient-to-b from-[#00f5ff]/[0.09] to-zinc-950/40 p-6 shadow-[0_0_36px_-16px_rgba(0,245,255,0.35)] transition-all duration-300",
                  "hover:border-[#00f5ff]/40 hover:shadow-[0_0_44px_-12px_rgba(0,245,255,0.4)]",
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00f5ff]/90">
                  Yes
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-white">
                  {yesPct.toFixed(1)}¢
                </p>
                <p className="mt-1 text-xs text-zinc-500">Implied probability</p>
                {needsApprove ? (
                  <TransactionButton
                    variant="muted"
                    className="mt-5"
                    loading={busy === "approve"}
                    disabled={invalid}
                    onClick={() => void approveBet()}
                  >
                    Approve USDC
                  </TransactionButton>
                ) : null}
                <TransactionButton
                  variant="primary"
                  className="mt-3"
                  loading={busy === "yes"}
                  disabled={!canBet || invalid || needsApprove}
                  onClick={() => void placeBet(true)}
                >
                  Bet YES
                </TransactionButton>
              </div>
              <div
                className={cn(
                  "group/panel rounded-2xl border border-[#a855f7]/30 bg-gradient-to-b from-[#a855f7]/[0.1] to-zinc-950/40 p-6 shadow-[0_0_36px_-16px_rgba(168,85,247,0.25)] transition-all duration-300",
                  "hover:border-[#a855f7]/45 hover:shadow-[0_0_44px_-12px_rgba(168,85,247,0.35)]",
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d8b4fe]/95">
                  No
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-white">
                  {noPct.toFixed(1)}¢
                </p>
                <p className="mt-1 text-xs text-zinc-500">Implied probability</p>
                {needsApprove ? (
                  <p className="mt-5 text-xs text-zinc-600">
                    Approve once for the amount above.
                  </p>
                ) : null}
                <TransactionButton
                  variant="purple"
                  className="mt-6"
                  loading={busy === "no"}
                  disabled={!canBet || invalid || needsApprove}
                  onClick={() => void placeBet(false)}
                >
                  Bet NO
                </TransactionButton>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-10 text-sm text-zinc-500">
            {!isConnected
              ? "Connect a wallet to trade."
              : wrongNetwork
                ? "Switch to Arc Testnet."
                : m.resolved
                  ? "This market is resolved."
                  : "Trading has ended."}
          </p>
        )}

        {m.resolved && payout > 0n && !claimedFlag && isConnected && !wrongNetwork ? (
          <div className="mt-8 rounded-2xl border border-[#00f5ff]/25 bg-gradient-to-br from-[#00f5ff]/[0.08] to-zinc-950/50 p-6 shadow-[0_0_32px_-14px_rgba(0,245,255,0.35)]">
            <p className="text-sm text-zinc-300">
              Claimable:{" "}
              <span className="font-semibold tabular-nums text-[#00f5ff]">
                {formatTokenAmount(payout, USDC_DECIMALS, 4)} USDC
              </span>
            </p>
            <TransactionButton
              variant="primary"
              className="mt-4 max-w-xs"
              loading={busy === "claim"}
              onClick={() => void claim()}
            >
              Claim winnings
            </TransactionButton>
          </div>
        ) : null}

        <div className="mt-8 rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-3.5 text-xs text-zinc-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
          Your position: Yes{" "}
          <span className="tabular-nums text-zinc-300">
            {formatTokenAmount(yesAmt, USDC_DECIMALS, 4)}
          </span>
          {" · "}No{" "}
          <span className="tabular-nums text-zinc-300">
            {formatTokenAmount(noAmt, USDC_DECIMALS, 4)}
          </span>{" "}
          USDC
        </div>

        {isOwner &&
        !m.resolved &&
        now !== undefined &&
        now > m.endTime &&
        totalPot > 0n ? (
          <div className="mt-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 ring-1 ring-white/[0.04]">
            <p className="text-sm font-semibold text-zinc-200">Resolve (owner)</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <TransactionButton
                variant="primary"
                loading={busy === "resolveY"}
                disabled={m.totalYes === 0n || wrongNetwork}
                onClick={() => void resolve(true)}
              >
                Yes won
              </TransactionButton>
              <TransactionButton
                variant="purple"
                loading={busy === "resolveN"}
                disabled={m.totalNo === 0n || wrongNetwork}
                onClick={() => void resolve(false)}
              >
                No won
              </TransactionButton>
            </div>
          </div>
        ) : null}

        {/* SCALAR: visual enhancement — recent activity list */}
        <section className="mt-14">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Recent bets
          </h2>
          {recentLoading ? (
            <p className="mt-4 text-xs text-zinc-600">Loading…</p>
          ) : recent.length === 0 ? (
            <p className="mt-4 text-xs text-zinc-600">
              No recent bets in the last ~4k blocks (RPC limited).
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-800/60 rounded-xl border border-zinc-800/70 bg-zinc-950/35">
              {recent.map((b, i) => (
                <li
                  key={`${b.user}-${i}`}
                  className="flex justify-between gap-4 px-3 py-2.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-900/40"
                >
                  <span>
                    {formatAddress(b.user)}{" "}
                    <span
                      className={
                        b.isYes ? "text-[#00f5ff]/85" : "text-[#a855f7]/85"
                      }
                    >
                      {b.isYes ? "Yes" : "No"}
                    </span>
                  </span>
                  <span className="tabular-nums text-zinc-300">
                    {formatTokenAmount(b.usdcAmount, USDC_DECIMALS, 2)} USDC
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <SiteFooter />
      </div>
    </AppPageShell>
  );
}
