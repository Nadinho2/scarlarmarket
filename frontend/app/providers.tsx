"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { ThemeProvider } from "next-themes";
import { WagmiProvider } from "wagmi";

import { WalletErrorToaster } from "@/components/WalletErrorToaster";
import { arcTestnet, wagmiConfig } from "@/lib/web3";

const queryClient = new QueryClient();

function WalletConnectEnvHint() {
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    if (!process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID?.trim()) {
      console.warn(
        "[SCALAR] Set NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID (https://cloud.reown.com) for WalletConnect and some mobile wallets.",
      );
    }
  }, []);
  return null;
}

// SCALAR: Wagmi + RainbowKit (Arc Testnet 5042002); wallet list in lib/web3.ts
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            initialChain={arcTestnet}
            modalSize="wide"
            showRecentTransactions={false}
            appInfo={{
              appName: "Scalar Market",
              learnMoreUrl: "https://metamask.io/faqs/",
            }}
            theme={darkTheme({
              accentColor: "#00f5ff",
              accentColorForeground: "#0a0a0f",
              borderRadius: "medium",
            })}
          >
            <WalletConnectEnvHint />
            <WalletErrorToaster />
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
