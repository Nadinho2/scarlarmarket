import { Suspense } from "react";
import { ScalarHomeMarkets } from "@/components/ScalarHomeMarkets";

// SCALAR: App Router home — markets discovery (hero, trending, filters, grid)
export default function Home() {
  return (
    <Suspense fallback={null}>
      <ScalarHomeMarkets />
    </Suspense>
  );
}
