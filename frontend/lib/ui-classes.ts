import { cn } from "@/utils/cn";

// SCALAR: shared form controls
export function vibeInput(className?: string) {
  return cn(
    "w-full rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-[15px] text-zinc-100 tabular-nums",
    "placeholder:text-zinc-600 outline-none transition",
    "focus:border-[#00f5ff]/35 focus:ring-1 focus:ring-[#00f5ff]/20",
    "disabled:cursor-not-allowed disabled:opacity-45",
    className,
  );
}

/** Admin mint form — purple focus ring */
export function vibeInputAdmin(className?: string) {
  return cn(
    vibeInput(),
    "focus:border-purple-500/50 focus:ring-purple-500/20",
    className,
  );
}
