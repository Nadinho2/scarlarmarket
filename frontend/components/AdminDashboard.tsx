"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Radio, Shield } from "lucide-react";
import { isAddress, parseUnits } from "viem";
import {
  useAccount,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";

import {
  CONTRACT_ADDRESSES,
  isContractConfigured,
  vibeTokenAbi,
} from "@/lib/contracts";
import { AppPageShell } from "@/components/AppPageShell";
import { SiteFooter } from "@/components/SiteFooter";
import { ScalarAppHeader } from "@/components/ScalarAppHeader";
import { useAutoArcSwitch } from "@/hooks/useAutoArcSwitch";
import { vibeInputAdmin } from "@/lib/ui-classes";
import { arcTestnet, wagmiConfig } from "@/lib/web3";
import { cn } from "@/utils/cn";
import { formatAddress, formatTokenAmount } from "@/utils/format";
import { toastTxError, toastTxSuccess } from "@/utils/toastTx";

import { TransactionButton } from "./TransactionButton";

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const { address, chainId, isConnected } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  useAutoArcSwitch();

  const wrongNetwork = isConnected && chainId !== arcTestnet.id;
  const configured = isContractConfigured();

  const { data: decimals = 18 } = useReadContract({
    address: CONTRACT_ADDRESSES.vibeToken,
    abi: vibeTokenAbi,
    functionName: "decimals",
    query: { enabled: configured },
  });

  const { data: symbol = "VIBE" } = useReadContract({
    address: CONTRACT_ADDRESSES.vibeToken,
    abi: vibeTokenAbi,
    functionName: "symbol",
    query: { enabled: configured },
  });

  const { data: tokenOwner } = useReadContract({
    address: CONTRACT_ADDRESSES.vibeToken,
    abi: vibeTokenAbi,
    functionName: "owner",
    query: { enabled: configured },
  });

  const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({
    address: CONTRACT_ADDRESSES.vibeToken,
    abi: vibeTokenAbi,
    functionName: "totalSupply",
    query: { enabled: configured, refetchInterval: 15_000 },
  });

  const ownerAddr =
    typeof tokenOwner === "string" && isAddress(tokenOwner)
      ? tokenOwner
      : undefined;

  const isOwner =
    !!address &&
    !!ownerAddr &&
    address.toLowerCase() === ownerAddr.toLowerCase();

  let amountWei: bigint | null = null;
  try {
    if (amount && configured) {
      amountWei = parseUnits(amount, Number(decimals));
    }
  } catch {
    amountWei = null;
  }

  const recipientOk =
    recipient.trim() !== "" && isAddress(recipient.trim() as `0x${string}`);
  const canMint =
    configured &&
    !wrongNetwork &&
    isOwner &&
    recipientOk &&
    amountWei !== null &&
    amountWei > 0n;

  const handleMint = useCallback(async () => {
    if (!canMint || amountWei === null) return;
    setBusy(true);
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.vibeToken,
        abi: vibeTokenAbi,
        functionName: "mint",
        args: [recipient.trim() as `0x${string}`, amountWei],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      toastTxSuccess(
        `Minted ${amount} ${String(symbol)} to ${formatAddress(recipient.trim())}`,
        hash,
      );
      setAmount("");
      setRecipient("");
      await refetchTotalSupply();
      await queryClient.invalidateQueries();
    } catch (e) {
      toastTxError(e);
    } finally {
      setBusy(false);
    }
  }, [
    amount,
    amountWei,
    canMint,
    queryClient,
    recipient,
    refetchTotalSupply,
    symbol,
    writeContractAsync,
  ]);

  return (
    <AppPageShell>
      <ScalarAppHeader />
      <div className="relative z-10 mx-auto max-w-2xl px-3 pb-12 pt-4 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8">
        <header className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-[#12121f] via-[#0c0c14] to-[#161028] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_60px_rgba(168,85,247,0.08)] sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10">
              <Shield className="h-5 w-5 text-purple-300" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Distribute{" "}
                <span className="text-purple-300">{String(symbol)}</span>
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Mint test tokens to any address. Only the on-chain token{" "}
                <span className="font-mono text-zinc-300">owner</span> can mint —
                connect that wallet to continue.
              </p>
            </div>
          </div>
        </header>

        {!configured ? (
          <div className="mt-6 flex gap-3 rounded-2xl border border-amber-500/35 bg-amber-950/20 px-4 py-3.5 text-sm text-amber-100/95 backdrop-blur-sm">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-400/90"
              aria-hidden
            />
            <div>
              <p className="font-medium text-amber-50">Token not configured</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-200/80">
                Set{" "}
                <code className="rounded-md bg-black/35 px-1.5 py-0.5 font-mono text-[11px]">
                  NEXT_PUBLIC_VIBE_TOKEN_ADDRESS
                </code>{" "}
                in{" "}
                <code className="rounded-md bg-black/35 px-1.5 py-0.5 font-mono text-[11px]">
                  .env.local
                </code>
                .
              </p>
            </div>
          </div>
        ) : null}

        {wrongNetwork ? (
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-cyan-500/35 bg-cyan-950/30 px-4 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Radio
                className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400"
                aria-hidden
              />
              <div>
                <p className="text-sm font-semibold text-cyan-100">
                  Wrong network — use Arc Testnet ({arcTestnet.id})
                </p>
                <p className="mt-1 text-xs text-cyan-200/75">
                  Switch below so mint transactions go to the right chain.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isSwitching}
              onClick={() => switchChain?.({ chainId: arcTestnet.id })}
              className="shrink-0 rounded-xl border border-cyan-400/45 bg-cyan-500/15 px-4 py-2.5 text-sm font-semibold text-cyan-50 hover:bg-cyan-500/25 disabled:opacity-50"
            >
              {isSwitching ? "Switching…" : "Switch to Arc Testnet"}
            </button>
          </div>
        ) : null}

        {configured && ownerAddr ? (
          <div className="mt-6 rounded-2xl border border-white/[0.06] bg-zinc-950/45 px-4 py-4 text-xs text-zinc-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm sm:px-5">
            <p>
              <span className="text-zinc-500">Owner </span>
              <span className="break-all font-mono text-zinc-300">
                {ownerAddr}
              </span>
            </p>
            {typeof totalSupply === "bigint" ? (
              <p className="mt-2">
                <span className="text-zinc-500">Total supply </span>
                <span className="font-mono text-sm text-purple-200/90">
                  {formatTokenAmount(totalSupply, Number(decimals), 4)}{" "}
                  {String(symbol)}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}

        {configured && isConnected && ownerAddr && !isOwner ? (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-950/25 px-4 py-4 text-sm text-amber-100/95 backdrop-blur-sm">
            <p className="font-semibold text-amber-50">Not the owner wallet</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-200/85">
              Switch to the deployer account in your wallet. The owner address
              is listed above.
            </p>
          </div>
        ) : null}

        {configured && isOwner && !wrongNetwork ? (
          <div className="mt-8 rounded-2xl border border-purple-500/20 bg-zinc-950/50 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_40px_rgba(168,85,247,0.07)] backdrop-blur-sm">
            <h2 className="text-lg font-bold text-purple-100">Mint to wallet</h2>
            <p className="mt-1 text-sm text-zinc-500">
              New {String(symbol)} is created and sent to the recipient. You pay
              gas.
            </p>

            <label className="mt-5 block text-xs font-medium text-zinc-400">
              Recipient
              <input
                type="text"
                spellCheck={false}
                autoComplete="off"
                placeholder="0x…"
                value={recipient}
                disabled={busy}
                onChange={(e) => setRecipient(e.target.value)}
                className={cn("mt-2 font-mono text-sm", vibeInputAdmin())}
              />
            </label>

            <label className="mt-4 block text-xs font-medium text-zinc-400">
              Amount ({String(symbol)})
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.0"
                value={amount}
                disabled={busy}
                onChange={(e) => setAmount(e.target.value)}
                className={cn("mt-2", vibeInputAdmin())}
              />
            </label>

            <div className="mt-6">
              <TransactionButton
                variant="outline"
                loading={busy}
                disabled={!canMint || busy}
                onClick={() => void handleMint()}
              >
                Mint tokens
              </TransactionButton>
            </div>
          </div>
        ) : null}

        <SiteFooter />
      </div>
    </AppPageShell>
  );
}
