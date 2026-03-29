"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/utils/cn";

// SCALAR: quiet button treatments — cyan primary, zinc outline, purple for NO-side emphasis
type Variant = "primary" | "outline" | "muted" | "purple";

// SCALAR: visual enhancement — smooth hover / focus transitions
const variantClass: Record<Variant, string> = {
  primary:
    "border-transparent bg-[#00f5ff] text-[#0a0a0f] shadow-[0_0_24px_-8px_rgba(0,245,255,0.35)] hover:bg-[#00f5ff]/88 hover:shadow-[0_0_28px_-6px_rgba(0,245,255,0.45)]",
  outline:
    "border-zinc-700 bg-transparent text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900/40",
  muted:
    "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900",
  purple:
    "border border-[#a855f7]/35 bg-[#a855f7]/[0.07] text-[#f3e8ff] shadow-[0_0_20px_-10px_rgba(168,85,247,0.2)] hover:border-[#a855f7]/45 hover:bg-[#a855f7]/12 hover:shadow-[0_0_26px_-8px_rgba(168,85,247,0.28)]",
};

type Props = {
  children: React.ReactNode;
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  className?: string;
  type?: "button" | "submit";
};

export function TransactionButton({
  children,
  onClick,
  disabled,
  loading,
  variant = "primary",
  className,
  type = "button",
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40",
        variantClass[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
