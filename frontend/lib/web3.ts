"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { defineChain } from "viem";
import { http } from "wagmi";

// SCALAR: Arc RPC from env
const ARC_RPC_URL =
  process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.testnet.arc.network";

const ARC_EXPLORER =
  process.env.NEXT_PUBLIC_ARC_EXPLORER_URL ?? "https://testnet.arcscan.app";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

/** Reown (WalletConnect Cloud) — https://cloud.reown.com */
const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID?.trim() ?? "";

// SCALAR: Arc Testnet (chainId 5042002)
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
  rpcUrls: {
    default: { http: [ARC_RPC_URL] },
  },
  blockExplorers: {
    default: {
      name: "Arcscan",
      url: ARC_EXPLORER,
    },
  },
  testnet: true,
});

// SCALAR: RainbowKit getDefaultConfig — injected first so MetaMask works via EIP-1193 (no SDK “extension not found” path for desktop)
export const wagmiConfig = getDefaultConfig({
  appName: "Scalar Market",
  appDescription: "USDC prediction markets on Arc Testnet",
  appUrl: APP_URL,
  projectId:
    WALLETCONNECT_PROJECT_ID ||
    "00000000000000000000000000000000",
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: http(ARC_RPC_URL),
  },
  ssr: true,
  wallets: [
    {
      groupName: "Recommended",
      wallets: [
        injectedWallet,
        metaMaskWallet,
        coinbaseWallet,
        walletConnectWallet,
      ],
    },
  ],
});
