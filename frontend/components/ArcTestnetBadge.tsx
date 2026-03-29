"use client";

import { cn } from "@/utils/cn";

type Props = {
  /** When false, wallet is not connected — still show static Arc label */
  isConnected: boolean;
  wrongNetwork?: boolean;
  onArc?: boolean;
  className?: string;
};

// SCALAR: always-visible network label; state reflects wallet when connected
export function ArcTestnetBadge({
  isConnected,
  wrongNetwork,
  onArc,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "hidden items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium sm:inline-flex",
        isConnected && wrongNetwork
          ? "border-red-900/50 text-red-300/90"
          : isConnected && onArc
            ? "border-zinc-800 text-zinc-400"
            : "border-zinc-800/80 text-zinc-600",
        className,
      )}
      title="Arc Testnet"
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          !isConnected && "bg-zinc-700",
          isConnected && wrongNetwork && "bg-red-400",
          isConnected && onArc && "bg-[#00f5ff]/60",
          isConnected && !wrongNetwork && !onArc && "bg-amber-500/70",
        )}
        aria-hidden
      />
      Arc Testnet
    </div>
  );
}
