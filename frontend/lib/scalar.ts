import type { Abi, Address } from "viem";

import scalarArtifact from "../contracts/abi/scalar-prediction-market.json";
import { erc20Abi } from "viem";

import {
  DEFAULT_SCALAR_MARKET_ADDRESS,
  DEFAULT_SCALAR_USDC_ADDRESS,
} from "./scalar-constants";

export {
  DEFAULT_SCALAR_MARKET_ADDRESS,
  DEFAULT_SCALAR_USDC_ADDRESS,
  SCALAR_CHAIN_ID,
} from "./scalar-constants";

// SCALAR: Arc Testnet defaults — override via `.env.local`
const ZERO = "0x0000000000000000000000000000000000000000" as Address;

export const scalarPredictionMarketAbi = scalarArtifact.abi as Abi;

export const SCALAR_MARKET_ADDRESS = (process.env
  .NEXT_PUBLIC_SCALAR_MARKET_ADDRESS ?? DEFAULT_SCALAR_MARKET_ADDRESS) as Address;

export const SCALAR_USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ??
  DEFAULT_SCALAR_USDC_ADDRESS) as Address;

export const scalarMarket = {
  address: SCALAR_MARKET_ADDRESS,
  abi: scalarPredictionMarketAbi,
} as const;

export const scalarUsdc = {
  address: SCALAR_USDC_ADDRESS,
  abi: erc20Abi,
} as const;

export const USDC_DECIMALS = 6;

// SCALAR: UI categories — free-form on-chain; filters normalize legacy labels
export const MARKET_CATEGORIES = [
  "Crypto",
  "Politics",
  "Sports",
  "Entertainment",
  "Economy",
  "NFTs",
  "Others",
] as const;

/** SCALAR: design enhancement — category chip filter matches legacy market strings */
export function matchesMarketCategory(
  onChainCategory: string,
  filter: string,
): boolean {
  if (!filter) return true;
  const c = onChainCategory.trim().toLowerCase();
  const f = filter.trim().toLowerCase();
  if (c === f) return true;
  if (f === "others")
    return (
      c === "other" ||
      c === "others" ||
      c === "science" ||
      c === "general" ||
      c.length === 0
    );
  if (f === "nfts") return c === "nft" || c === "nfts";
  return false;
}

export type MarketCategory = (typeof MARKET_CATEGORIES)[number];

export function isScalarConfigured(): boolean {
  return SCALAR_MARKET_ADDRESS !== ZERO;
}

/** SCALAR: On-chain payout mirror of `ScalarPredictionMarket._payoutOf` for portfolio UI */
export function computePendingPayout(
  m: {
    resolved: boolean;
    outcomeIsYes: boolean;
    totalYes: bigint;
    totalNo: bigint;
  },
  userYes: bigint,
  userNo: bigint,
  claimed: boolean,
): bigint {
  if (!m.resolved || claimed) return 0n;
  const totalPot = m.totalYes + m.totalNo;
  const platformFee = (totalPot * 150n) / 10000n;
  const winningPool = totalPot - platformFee;
  const winTotal = m.outcomeIsYes ? m.totalYes : m.totalNo;
  if (winTotal === 0n) return 0n;
  const userStake = m.outcomeIsYes ? userYes : userNo;
  if (userStake === 0n) return 0n;
  return (userStake * winningPool) / winTotal;
}
