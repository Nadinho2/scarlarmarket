"use client";

// SCALAR: trade, resolve (owner), claim — parimutuel binary market

import { useState } from "react";
import { parseUnits } from "viem";
import {
  useAccount,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { simulateContract, waitForTransactionReceipt } from "wagmi/actions";

import type { MarketWithPosition } from "@/hooks/usePredictionMarkets";
import {
  CONTRACT_ADDRESSES,
  isContractConfigured,
  isMarketsConfigured,
  VIBE_PREDICTION_MARKET_ADDRESS,
  vibePredictionMarketAbi,
  vibeTokenAbi,
} from "@/lib/contracts";
import { vibeInput } from "@/lib/ui-classes";
import { arcTestnet, wagmiConfig } from "@/lib/web3";
import { cn } from "@/utils/cn";
import { formatTokenAmount } from "@/utils/format";
import { toastTxError, toastTxSuccess } from "@/utils/toastTx";

import { TransactionButton } from "./TransactionButton";

type Props = {
  row: MarketWithPosition;
  now: bigint;
  tokenDecimals: number;
  tokenSymbol: string;
  feeBps: bigint;
  isOwner: boolean;
  wrongNetwork: boolean;
  onTxSuccess: () => Promise<void>;
};

function marketStatus(
  m: MarketWithPosition["market"],
  now: bigint,
): "open" | "closed" | "resolved" {
  if (m.resolved) return "resolved";
  if (now >= m.endTime) return "closed";
  return "open";
}

export function MarketCard({
  row,
  now,
  tokenDecimals,
  tokenSymbol,
  feeBps,
  isOwner,
  wrongNetwork,
  onTxSuccess,
}: Props) {
  const { address, isConnected } = useAccount();
  const { market, id, userYes, userNo, claimed } = row;
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState<
    "approveYes" | "approveNo" | "yes" | "no" | "resolveYes" | "resolveNo" | "claim" | null
  >(null);

  const status = marketStatus(market, now);
  const totalPot = market.totalYes + market.totalNo;

  const yesPct =
    totalPot > 0n
      ? Number((market.totalYes * 10000n) / totalPot) / 100
      : 50;
  const noPct =
    totalPot > 0n
      ? Number((market.totalNo * 10000n) / totalPot) / 100
      : 50;

  const winningTotal = market.winningIsYes ? market.totalYes : market.totalNo;
  const userWinning = market.winningIsYes ? userYes : userNo;
  const estimatedPayout =
    market.resolved && winningTotal > 0n && userWinning > 0n
      ? (userWinning * totalPot) / winningTotal
      : 0n;

  const { writeContractAsync } = useWriteContract();

  const { data: marketOwner } = useReadContract({
    address: VIBE_PREDICTION_MARKET_ADDRESS,
    abi: vibePredictionMarketAbi,
    functionName: "owner",
    query: { enabled: isMarketsConfigured() },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.vibeToken,
    abi: vibeTokenAbi,
    functionName: "allowance",
    args:
      address && isContractConfigured()
        ? [address, VIBE_PREDICTION_MARKET_ADDRESS]
        : undefined,
    query: {
      enabled: !!address && isContractConfigured(),
      refetchInterval: 8000,
    },
  });

  let amountWei: bigint | null = null;
  try {
    if (amount && isContractConfigured()) {
      amountWei = parseUnits(amount, tokenDecimals);
    }
  } catch {
    amountWei = null;
  }

  const invalidAmount = !amountWei || amountWei === 0n;
  const allowanceBig =
    typeof allowance === "bigint" ? allowance : undefined;
  const allowanceReady = allowanceBig !== undefined;
  const needsApprove =
    !invalidAmount &&
    allowanceReady &&
    allowanceBig! < amountWei!;

  async function approveForBet() {
    if (!address || amountWei === null || !isContractConfigured()) return;
    setBusy("approveYes");
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.vibeToken,
        abi: vibeTokenAbi,
        functionName: "approve",
        args: [VIBE_PREDICTION_MARKET_ADDRESS, amountWei],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      toastTxSuccess("Approved for this amount", hash);
      await refetchAllowance();
    } catch (e) {
      toastTxError(e, "Approve failed");
    } finally {
      setBusy(null);
    }
  }

  async function placeBet(isYes: boolean) {
    if (!address || amountWei === null || invalidAmount) return;
    if (needsApprove) {
      toastTxError(
        new Error("Approve first"),
        "Approve the spending cap for this amount",
      );
      return;
    }
    setBusy(isYes ? "yes" : "no");
    try {
      await simulateContract(wagmiConfig, {
        address: VIBE_PREDICTION_MARKET_ADDRESS,
        abi: vibePredictionMarketAbi,
        functionName: "bet",
        args: [id, isYes, amountWei],
        account: address,
      });
      const hash = await writeContractAsync({
        address: VIBE_PREDICTION_MARKET_ADDRESS,
        abi: vibePredictionMarketAbi,
        functionName: "bet",
        args: [id, isYes, amountWei],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      toastTxSuccess(
        isYes ? "YES position confirmed" : "NO position confirmed",
        hash,
      );
      setAmount("");
      await onTxSuccess();
    } catch (e) {
      toastTxError(e, "Could not place position");
    } finally {
      setBusy(null);
    }
  }

  async function resolve(winYes: boolean) {
    if (!address || !isOwner) {
      toastTxError(
        new Error("not owner"),
        "Connect the contract owner wallet to resolve this market.",
      );
      return;
    }
    if (wrongNetwork) {
      toastTxError(
        new Error("wrong network"),
        "Switch to Arc Testnet before resolving.",
      );
      return;
    }
    setBusy(winYes ? "resolveYes" : "resolveNo");
    try {
      await simulateContract(wagmiConfig, {
        address: VIBE_PREDICTION_MARKET_ADDRESS,
        abi: vibePredictionMarketAbi,
        functionName: "resolveMarket",
        args: [id, winYes],
        account: address,
        chainId: arcTestnet.id,
      });
      const hash = await writeContractAsync({
        address: VIBE_PREDICTION_MARKET_ADDRESS,
        abi: vibePredictionMarketAbi,
        functionName: "resolveMarket",
        args: [id, winYes],
        account: address,
        chainId: arcTestnet.id,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      toastTxSuccess("Market resolved", hash);
      await onTxSuccess();
    } catch (e) {
      toastTxError(e, "Resolve failed");
    } finally {
      setBusy(null);
    }
  }

  async function claim() {
    if (!address) return;
    setBusy("claim");
    try {
      await simulateContract(wagmiConfig, {
        address: VIBE_PREDICTION_MARKET_ADDRESS,
        abi: vibePredictionMarketAbi,
        functionName: "claimWinnings",
        args: [id],
        account: address,
      });
      const hash = await writeContractAsync({
        address: VIBE_PREDICTION_MARKET_ADDRESS,
        abi: vibePredictionMarketAbi,
        functionName: "claimWinnings",
        args: [id],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      toastTxSuccess("Winnings sent to your wallet", hash);
      await onTxSuccess();
    } catch (e) {
      toastTxError(e, "Claim failed");
    } finally {
      setBusy(null);
    }
  }

  const canBet =
    isConnected &&
    !wrongNetwork &&
    status === "open" &&
    isContractConfigured();

  const canResolveOnChain =
    isOwner && isConnected && !wrongNetwork && !!address;

  const resolveYesDisabled =
    market.totalYes === 0n || busy !== null || !canResolveOnChain;
  const resolveNoDisabled =
    market.totalNo === 0n || busy !== null || !canResolveOnChain;

  const showClaim =
    market.resolved &&
    userWinning > 0n &&
    !claimed;

  const endLabel = new Date(Number(market.endTime) * 1000).toLocaleString(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );

  return (
    <article
      id={`market-${id.toString()}`}
      className={cn(
        "scroll-mt-28 rounded-xl border border-zinc-800/90 bg-zinc-950/30 p-5 sm:p-6",
        status === "resolved" &&
          "border-zinc-700/80",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
            Market #{id.toString()}
          </p>
          <h3 className="mt-1 text-base font-medium leading-snug text-white sm:text-lg">
            {market.question}
          </h3>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Yes {yesPct.toFixed(1)}%</span>
          <span>No {noPct.toFixed(1)}%</span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="bg-[#00f5ff]/45"
            style={{ width: `${yesPct}%` }}
          />
          <div className="flex-1 bg-zinc-700/60" />
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-800/80 px-3 py-2.5">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
            Ends
          </dt>
          <dd className="mt-0.5 text-xs tabular-nums text-zinc-300">{endLabel}</dd>
        </div>
        <div className="rounded-lg border border-zinc-800/80 px-3 py-2.5">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
            Volume
          </dt>
          <dd className="mt-0.5 text-xs tabular-nums text-zinc-200">
            {formatTokenAmount(totalPot, tokenDecimals, 2)} {tokenSymbol}
          </dd>
        </div>
        <div className="col-span-2 rounded-lg border border-zinc-800/80 px-3 py-2.5 sm:col-span-1">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
            Your stake
          </dt>
          <dd className="mt-0.5 text-xs text-zinc-300">
            Yes {formatTokenAmount(userYes, tokenDecimals, 4)} · No{" "}
            {formatTokenAmount(userNo, tokenDecimals, 4)}{" "}
            <span className="text-zinc-500">{tokenSymbol}</span>
          </dd>
        </div>
      </dl>

      {feeBps > 0n ? (
        <p className="mt-4 text-[11px] leading-relaxed text-zinc-600">
          {(Number(feeBps) / 100).toFixed(0)}% fee on each position; remainder
          stays in the pool for winners.
        </p>
      ) : (
        <p className="mt-4 text-[11px] text-zinc-600">
          No protocol fee — full amount enters the pool.
        </p>
      )}

      {status === "open" && isOwner ? (
        <p className="mt-3 rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-3 py-2 text-[11px] text-zinc-500">
          Owner: after end time, resolve from this card with the same wallet.
        </p>
      ) : null}

      {status === "open" ? (
        <div className="mt-5 space-y-3">
          <label className="block text-xs font-medium text-zinc-500">
            Amount ({tokenSymbol})
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={vibeInput()}
            disabled={!canBet}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            {needsApprove && canBet ? (
              <TransactionButton
                variant="muted"
                loading={busy === "approveYes"}
                disabled={!canBet || invalidAmount}
                onClick={() => void approveForBet()}
                className="min-h-[48px] sm:flex-1"
              >
                Approve {tokenSymbol}
              </TransactionButton>
            ) : null}
            <TransactionButton
              variant="primary"
              loading={busy === "yes"}
              disabled={!canBet || invalidAmount || needsApprove}
              onClick={() => void placeBet(true)}
              className="min-h-[48px] flex-1"
            >
              Buy Yes
            </TransactionButton>
            <TransactionButton
              variant="outline"
              loading={busy === "no"}
              disabled={!canBet || invalidAmount || needsApprove}
              onClick={() => void placeBet(false)}
              className="min-h-[48px] flex-1"
            >
              Buy No
            </TransactionButton>
          </div>
        </div>
      ) : null}

      {status === "closed" && isOwner && totalPot === 0n ? (
        <p className="mt-4 text-xs text-zinc-600">
          No pool liquidity — nothing to resolve.
        </p>
      ) : null}

      {status === "closed" && isOwner && totalPot > 0n ? (
        <div className="mt-5 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/25 p-4">
          <p className="text-sm font-medium text-zinc-200">
            Resolve outcome
          </p>
          <p className="text-xs text-zinc-500">
            Choose the winning side. This sends{" "}
            <code className="text-zinc-400">resolveMarket</code> on Arc.
          </p>
          {wrongNetwork ? (
            <p className="text-xs text-red-300/90">
              Switch to Arc Testnet to submit resolution.
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <TransactionButton
              variant="primary"
              loading={busy === "resolveYes"}
              disabled={resolveYesDisabled}
              onClick={() => void resolve(true)}
              className="min-h-[48px] flex-1"
            >
              Resolve Yes
            </TransactionButton>
            <TransactionButton
              variant="outline"
              loading={busy === "resolveNo"}
              disabled={resolveNoDisabled}
              onClick={() => void resolve(false)}
              className="min-h-[48px] flex-1"
            >
              Resolve No
            </TransactionButton>
          </div>
        </div>
      ) : null}

      {status === "closed" && !isOwner ? (
        <p className="mt-4 text-xs text-zinc-500">
          Awaiting resolution
          {typeof marketOwner === "string" ? (
            <>
              {" "}
              <span className="font-mono text-zinc-400">
                {marketOwner.slice(0, 6)}…{marketOwner.slice(-4)}
              </span>
            </>
          ) : null}
          .
        </p>
      ) : null}

      {market.resolved ? (
        <div className="mt-5 space-y-3 border-t border-zinc-800/80 pt-5">
          <p className="text-sm text-zinc-300">
            Outcome:{" "}
            <span
              className={cn(
                "font-medium",
                market.winningIsYes ? "text-[#00f5ff]/90" : "text-zinc-400",
              )}
            >
              {market.winningIsYes ? "Yes" : "No"}
            </span>
          </p>
          {userWinning > 0n ? (
            <p className="text-xs text-zinc-500">
              Estimated payout:{" "}
              <span className="tabular-nums text-zinc-300">
                {formatTokenAmount(estimatedPayout, tokenDecimals, 4)}{" "}
                {tokenSymbol}
              </span>
            </p>
          ) : (
            <p className="text-xs text-zinc-600">No stake on the winning side.</p>
          )}
          {showClaim ? (
            <TransactionButton
              variant="primary"
              loading={busy === "claim"}
              onClick={() => void claim()}
            >
              Claim
            </TransactionButton>
          ) : null}
          {claimed && userWinning > 0n ? (
            <p className="text-xs text-zinc-500">Claimed.</p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function StatusPill({
  status,
}: {
  status: "open" | "closed" | "resolved";
}) {
  const map = {
    open: {
      label: "Open",
      className: "border-zinc-700 text-zinc-400",
    },
    closed: {
      label: "Closed",
      className: "border-zinc-700 text-zinc-500",
    },
    resolved: {
      label: "Resolved",
      className: "border-zinc-600 text-zinc-400",
    },
  };
  const m = map[status];
  return (
    <span
      className={cn(
        "shrink-0 rounded-md border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider",
        m.className,
      )}
    >
      {m.label}
    </span>
  );
}
