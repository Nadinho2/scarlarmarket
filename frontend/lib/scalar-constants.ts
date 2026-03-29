import type { Address } from "viem";

/** Arc Testnet — SCALAR app target chain */
export const SCALAR_CHAIN_ID = 5042002 as const;

/** Deployed `ScalarPredictionMarket` on Arc Testnet (override with `NEXT_PUBLIC_SCALAR_MARKET_ADDRESS`) */
export const DEFAULT_SCALAR_MARKET_ADDRESS =
  "0x270B7B5a047A956ED60bdD6319281757134D33Af" as Address;

/** Native USDC on Arc Testnet (override with `NEXT_PUBLIC_USDC_ADDRESS`) */
export const DEFAULT_SCALAR_USDC_ADDRESS =
  "0x3600000000000000000000000000000000000000" as Address;
