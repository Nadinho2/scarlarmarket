"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useSwitchChain } from "wagmi";

import { arcTestnet } from "@/lib/web3";
import { cn } from "@/utils/cn";

// SCALAR: visual enhancement — connect CTA + Arc switch with soft glow
export function ScalarConnectButton() {
  const { switchChain, isPending: switching } = useSwitchChain();

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        mounted,
        openAccountModal,
        openChainModal,
        openConnectModal,
      }) => {
        if (!mounted) {
          return (
            <div
              className="h-11 min-w-[148px] animate-pulse rounded-xl bg-zinc-800/90"
              aria-hidden
            />
          );
        }

        if (!account) {
          return (
            <button
              type="button"
              onClick={openConnectModal}
              className={cn(
                "inline-flex min-h-[44px] min-w-[148px] items-center justify-center rounded-xl px-5 text-sm font-semibold tracking-tight",
                "bg-[#00f5ff] text-[#0a0a0f] shadow-[0_0_28px_-6px_rgba(0,245,255,0.4)]",
                "transition-all duration-200 hover:bg-[#00f5ff]/90 hover:shadow-[0_0_36px_-4px_rgba(0,245,255,0.5)]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00f5ff]/50",
              )}
            >
              Connect wallet
            </button>
          );
        }

        const wrongNetwork =
          !chain ||
          chain.unsupported === true ||
          chain.id !== arcTestnet.id;

        return (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {wrongNetwork ? (
              <button
                type="button"
                disabled={switching}
                onClick={() => {
                  if (switchChain) {
                    switchChain({ chainId: arcTestnet.id });
                  } else {
                    openChainModal();
                  }
                }}
                className={cn(
                  "inline-flex min-h-[40px] items-center justify-center rounded-xl border px-3 text-xs font-semibold uppercase tracking-wide",
                  "border-amber-700/50 bg-amber-950/40 text-amber-100 transition-all hover:border-amber-500/45 hover:shadow-[0_0_20px_-8px_rgba(245,158,11,0.25)]",
                  "disabled:opacity-50",
                )}
              >
                {switching ? "Switching…" : "Switch to Arc"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={openAccountModal}
              className={cn(
                "inline-flex min-h-[44px] max-w-[200px] items-center gap-2 rounded-xl border border-zinc-700/90 bg-zinc-900/80 px-3 text-sm font-medium text-zinc-100",
                "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-all duration-200",
                "hover:border-[#00f5ff]/35 hover:bg-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00f5ff]/40",
              )}
            >
              <span className="truncate tabular-nums">{account.displayName}</span>
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
