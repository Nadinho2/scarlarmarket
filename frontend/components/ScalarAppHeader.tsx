"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";

import { ArcTestnetBadge } from "@/components/ArcTestnetBadge";
import { ScalarConnectButton } from "@/components/ScalarConnectButton";
import { UsdcBalanceBadge } from "@/components/UsdcBalanceBadge";
import { arcTestnet } from "@/lib/web3";
import { cn } from "@/utils/cn";

function NavLinks() {
  const pathname = usePathname();
  const marketsActive =
    pathname === "/" || pathname.startsWith("/markets");
  const link = (href: string, label: string, activeOverride?: boolean) => {
    const active = activeOverride ?? pathname === href;
    return (
      <Link
        href={href}
        className={cn(
          "relative rounded-lg px-2.5 py-2 text-sm font-medium tracking-tight transition-all duration-200 sm:px-3",
          active
            ? "text-[#00f5ff]"
            : "text-zinc-500 hover:text-zinc-200",
        )}
      >
        {/* SCALAR: design enhancement — active underline + glow */}
        {active ? (
          <span className="absolute inset-x-1 -bottom-px h-px bg-gradient-to-r from-transparent via-[#00f5ff]/80 to-transparent shadow-[0_0_12px_rgba(0,245,255,0.5)]" />
        ) : null}
        <span className="relative">{label}</span>
      </Link>
    );
  };
  return (
    <nav className="flex flex-wrap items-center justify-center gap-0.5 sm:gap-0.5" aria-label="Primary">
      {/* SCALAR: design enhancement — primary navigation */}
      {link("/", "Markets", marketsActive)}
      {link("/create", "Create")}
      {link("/portfolio", "Portfolio")}
      {link("/analytics", "Analytics")}
    </nav>
  );
}

// SCALAR: header — logo, centered nav, Arc + USDC balance + wallet
export function ScalarAppHeader() {
  const { chainId, isConnected } = useAccount();
  const onArc = isConnected && chainId === arcTestnet.id;
  const wrongNetwork = isConnected && chainId !== arcTestnet.id;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-zinc-800/60 bg-[#0a0a0f]/90 backdrop-blur-xl backdrop-saturate-150 shadow-[0_8px_32px_-20px_rgba(0,0,0,0.65)]",
        wrongNetwork && "border-red-900/35",
      )}
    >
      {/* SCALAR: design enhancement — hairline top sheen + cyan/purple mesh */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00f5ff]/20 to-transparent"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,rgba(0,245,255,0.04),transparent_50%)]" />
      <div className="relative mx-auto flex min-h-[3.75rem] max-w-6xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="z-10 shrink-0 transition-opacity hover:opacity-95"
        >
          {/* SCALAR: design enhancement — wordmark */}
          <span className="bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-[15px] font-semibold tracking-tight text-transparent sm:text-base">
            Scalar Market
          </span>
        </Link>

        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
          <NavLinks />
        </div>

        {/* SCALAR: visual enhancement — right cluster: network, balance, connect */}
        <div className="z-10 flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3 md:flex-initial md:gap-3">
          <ArcTestnetBadge
            isConnected={isConnected}
            wrongNetwork={wrongNetwork}
            onArc={onArc}
          />
          <UsdcBalanceBadge />
          <ScalarConnectButton />
        </div>
      </div>

      <div className="border-t border-zinc-800/40 px-4 pb-3 pt-2 md:hidden">
        <div className="flex justify-center">
          <NavLinks />
        </div>
      </div>

      {wrongNetwork && isConnected ? (
        <div className="border-t border-red-900/25 bg-red-950/15 px-4 py-2 text-center text-xs text-red-200/85">
          Switch to Arc Testnet (chain {arcTestnet.id}) to trade.
        </div>
      ) : null}
    </header>
  );
}
