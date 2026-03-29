"use client";

type Props = {
  children: React.ReactNode;
};

// SCALAR: design enhancement — premium depth mesh on #0a0a0f (cyan + violet)
export function AppPageShell({ children }: Props) {
  return (
    <div className="relative min-h-screen bg-[#0a0a0f] text-zinc-200 antialiased selection:bg-[#00f5ff]/15 selection:text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-20%,rgba(0,245,255,0.09),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_0%,rgba(0,245,255,0.045),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_45%_at_0%_100%,rgba(168,85,247,0.06),transparent_52%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(10,10,15,0)_0%,rgba(10,10,15,0.4)_100%)]"
        aria-hidden
      />
      {children}
    </div>
  );
}
