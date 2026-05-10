"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PenLine, Radio } from "lucide-react";
import {
  useAccount,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import {
  readContract,
  simulateContract,
  waitForTransactionReceipt,
} from "wagmi/actions";
import { toast } from "sonner";

import { AppPageShell } from "@/components/AppPageShell";
import { ScalarAppHeader } from "@/components/ScalarAppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TransactionButton } from "@/components/TransactionButton";
import { useAutoArcSwitch } from "@/hooks/useAutoArcSwitch";
import { useScalarChainNow } from "@/hooks/useScalarMarkets";
import { useScalarMarketEvents } from "@/hooks/useScalarMarketEvents";
import {
  MARKET_CATEGORIES,
  SCALAR_MARKET_ADDRESS,
  USDC_DECIMALS,
  isScalarConfigured,
  scalarPredictionMarketAbi,
  scalarUsdc,
} from "@/lib/scalar";
import { arcTestnet, wagmiConfig } from "@/lib/web3";
import { formatAddress, formatTokenAmount, getExplorerTxUrl } from "@/utils/format";
import { toastTxError, toastTxSuccess } from "@/utils/toastTx";

// SCALAR: design enhancement — create flow with fee callout + polished form
export function ScalarCreatePage() {
  const router = useRouter();
  const { address, chainId, isConnected } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();
  const wrongNetwork = isConnected && chainId !== arcTestnet.id;
  const chainNow = useScalarChainNow();
  // SCALAR: form hint only — chain tx still enforces `block.timestamp`
  const nowForForm =
    chainNow ?? BigInt(Math.floor(Date.now() / 1000));

  useAutoArcSwitch();
  useScalarMarketEvents(isScalarConfigured() && !wrongNetwork);

  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState<string>(MARKET_CATEGORIES[0]);
  const [endLocal, setEndLocal] = useState("");
  const [busy, setBusy] = useState<"approve" | "create" | null>(null);

  const { writeContractAsync } = useWriteContract();

  const { data: creationFee } = useReadContract({
    address: SCALAR_MARKET_ADDRESS,
    abi: scalarPredictionMarketAbi,
    functionName: "CREATION_FEE",
    query: { enabled: isScalarConfigured() },
  });

  const feeWei =
    typeof creationFee === "bigint" ? creationFee : 10n * 10n ** 6n;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    ...scalarUsdc,
    functionName: "allowance",
    args:
      address && isScalarConfigured()
        ? [address, SCALAR_MARKET_ADDRESS]
        : undefined,
    query: {
      enabled: !!address && isScalarConfigured(),
      refetchInterval: 12_000,
    },
  });

  const allowanceB = typeof allowance === "bigint" ? allowance : 0n;
  const needsApprove = allowanceB < feeWei;

  const endTimeUnix = useMemo(() => {
    if (!endLocal) return null;
    const ms = new Date(endLocal).getTime();
    if (Number.isNaN(ms)) return null;
    return BigInt(Math.floor(ms / 1000));
  }, [endLocal]);

  const validTime =
    endTimeUnix !== null &&
    endTimeUnix > nowForForm &&
    endTimeUnix > nowForForm + 60n;
  const validQuestion = question.trim().length > 0;
  const canSubmit =
    isScalarConfigured() &&
    isConnected &&
    !wrongNetwork &&
    validQuestion &&
    validTime &&
    category.length > 0;

  async function approveFee() {
    if (!address || !isScalarConfigured()) return;
    setBusy("approve");
    try {
      await simulateContract(wagmiConfig, {
        ...scalarUsdc,
        functionName: "approve",
        args: [SCALAR_MARKET_ADDRESS, feeWei],
        account: address,
      });
      const hash = await writeContractAsync({
        ...scalarUsdc,
        functionName: "approve",
        args: [SCALAR_MARKET_ADDRESS, feeWei],
        chainId: arcTestnet.id,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      toastTxSuccess("Approved USDC for creation fee", hash);
      await refetchAllowance();
    } catch (e) {
      toastTxError(e, "Approve failed");
    } finally {
      setBusy(null);
    }
  }

  async function create() {
    if (!address || !canSubmit || endTimeUnix === null) return;
    if (needsApprove) {
      toastTxError(new Error("approve"), "Approve the creation fee first");
      return;
    }
    setBusy("create");
    try {
      const q = question.trim();
      await simulateContract(wagmiConfig, {
        address: SCALAR_MARKET_ADDRESS,
        abi: scalarPredictionMarketAbi,
        functionName: "createMarket",
        args: [q, endTimeUnix, category],
        account: address,
      });
      const hash = await writeContractAsync({
        address: SCALAR_MARKET_ADDRESS,
        abi: scalarPredictionMarketAbi,
        functionName: "createMarket",
        args: [q, endTimeUnix, category],
        chainId: arcTestnet.id,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      const count = await readContract(wagmiConfig, {
        address: SCALAR_MARKET_ADDRESS,
        abi: scalarPredictionMarketAbi,
        functionName: "marketCount",
      });
      const newId = (count as bigint) - 1n;

      const marketUrl = `${window.location.origin}/markets/${newId.toString()}`;
      const shortQ = q.length > 180 ? `${q.slice(0, 177)}...` : q;
      const creatorLabel = formatAddress(address, 4);
      const text = `I just created a new market on Scalar:\n"${shortQ}"\nCreator: ${creatorLabel}`;
      const intent = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(marketUrl)}`;
      const txUrl = getExplorerTxUrl(hash);

      toast.success("Market created", {
        description: `Creator: ${creatorLabel}`,
        action: {
          label: "Share on X",
          onClick: () => window.open(intent, "_blank", "noopener,noreferrer"),
        },
        cancel: {
          label: "View on Arcscan",
          onClick: () => window.open(txUrl, "_blank", "noopener,noreferrer"),
        },
      });

      router.push(`/markets/${newId.toString()}`);
    } catch (e) {
      toastTxError(e, "Create failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppPageShell>
      <ScalarAppHeader />
      <div className="relative z-10 mx-auto max-w-lg px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div
          className="pointer-events-none absolute -inset-x-16 -top-8 h-40 bg-[radial-gradient(ellipse_at_center,rgba(0,245,255,0.08),transparent_70%)]"
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00f5ff]/20 to-zinc-900/90 ring-1 ring-[#00f5ff]/30 shadow-[0_0_32px_-10px_rgba(0,245,255,0.4)]">
            <PenLine className="h-5 w-5 text-[#00f5ff]" aria-hidden />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00f5ff]/80">
              Scalar Market
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Create a market
            </h1>
            <p className="mt-1 max-w-lg text-sm leading-relaxed text-zinc-500">
              Set the question, category, and end time. A one-time USDC fee is
              collected on-chain.
            </p>
          </div>
        </div>

        {/* SCALAR: design enhancement — 10 USDC creation fee (matches `CREATION_FEE`) */}
        <div className="relative mt-8 overflow-hidden rounded-2xl border border-[#00f5ff]/20 bg-gradient-to-br from-[#00f5ff]/[0.08] via-zinc-950/60 to-zinc-950/80 px-5 py-5 shadow-[0_0_40px_-16px_rgba(0,245,255,0.25)] ring-1 ring-white/[0.04]">
          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#00f5ff]/10 blur-2xl" />
          <p className="relative text-[10px] font-semibold uppercase tracking-[0.22em] text-[#00f5ff]/90">
            Creation fee
          </p>
          <p className="relative mt-2 flex flex-wrap items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums tracking-tight text-white">
              {formatTokenAmount(feeWei, USDC_DECIMALS, 2)}
            </span>
            <span className="text-lg font-medium text-[#00f5ff]/90">USDC</span>
          </p>
          <p className="relative mt-2 text-sm text-zinc-500">
            Charged once when your market is created — sent per the contract
            rules.
          </p>
        </div>

        {wrongNetwork ? (
          <div className="mt-8 flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Radio className="h-4 w-4 text-zinc-500" aria-hidden />
              Switch to Arc Testnet to create.
            </div>
            <button
              type="button"
              disabled={switching}
              onClick={() => switchChain?.({ chainId: arcTestnet.id })}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-[#00f5ff]/30 disabled:opacity-50"
            >
              {switching ? "…" : "Switch network"}
            </button>
          </div>
        ) : null}

        {!isScalarConfigured() ? (
          <p className="mt-8 rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90">
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

        {!isConnected ? (
          <p className="mt-10 text-sm text-zinc-500">
            Connect a wallet to create a market.
          </p>
        ) : null}

        {isScalarConfigured() && isConnected && !wrongNetwork ? (
          <form
            className="mt-10 space-y-7 rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/35 to-zinc-950/70 p-6 shadow-[0_0_56px_-24px_rgba(0,245,255,0.14),inset_0_1px_0_0_rgba(255,255,255,0.04)] sm:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            {/* SCALAR: visual enhancement — question */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
                Question
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={4}
                placeholder="Will … ?"
                className="mt-2 w-full resize-y rounded-xl border border-zinc-800/90 bg-zinc-950/50 px-3 py-2.5 text-sm text-zinc-100 shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] placeholder:text-zinc-600 focus:border-[#00f5ff]/30 focus:outline-none focus:ring-2 focus:ring-[#00f5ff]/12"
              />
            </div>

            {/* SCALAR: visual enhancement — category */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-800/90 bg-zinc-950/50 px-3 py-3 text-sm text-zinc-200 shadow-[inset_0_2px_6px_rgba(0,0,0,0.15)] focus:border-[#00f5ff]/25 focus:outline-none"
              >
                {MARKET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* SCALAR: visual enhancement — end time */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
                End date &amp; time
              </label>
              <input
                type="datetime-local"
                value={endLocal}
                onChange={(e) => setEndLocal(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-800/90 bg-zinc-950/50 px-3 py-3 text-sm text-zinc-200 shadow-[inset_0_2px_6px_rgba(0,0,0,0.15)] focus:border-[#00f5ff]/25 focus:outline-none"
              />
              {endTimeUnix !== null && endTimeUnix <= nowForForm + 60n ? (
                <p className="mt-2 text-xs text-amber-200/80">
                  End time must be at least ~1 minute after the current chain
                  time.
                </p>
              ) : null}
            </div>

            {needsApprove ? (
              <TransactionButton
                type="button"
                variant="muted"
                className="w-full"
                loading={busy === "approve"}
                onClick={() => void approveFee()}
              >
                Approve{" "}
                {formatTokenAmount(feeWei, USDC_DECIMALS, 2)} USDC
              </TransactionButton>
            ) : null}

            <TransactionButton
              type="submit"
              variant="primary"
              className="w-full"
              loading={busy === "create"}
              disabled={!canSubmit || needsApprove}
            >
              Create market
            </TransactionButton>
          </form>
        ) : null}

        <p className="mt-8 text-center text-xs text-zinc-600">
          <Link href="/" className="text-[#00f5ff]/80 hover:underline">
            ← Back to markets
          </Link>
        </p>

        <SiteFooter />
      </div>
    </AppPageShell>
  );
}
