// SCALAR: design enhancement — footer with dual-accent divider
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-zinc-800/40 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10 text-center">
      <div
        className="mx-auto mb-6 h-px max-w-sm bg-gradient-to-r from-transparent via-[#00f5ff]/20 to-transparent"
        aria-hidden
      />
      <p className="text-xs text-zinc-600">
        Scalar Market · Arc Testnet · USDC prediction markets
      </p>
    </footer>
  );
}
