import type { Abi, Address } from "viem";

import vibePredictionMarketArtifact from "../contracts/abi/vibe-prediction-market.json";
import vibeStakingArtifact from "../contracts/abi/vibe-staking.json";
import vibeTokenArtifact from "../contracts/abi/vibe-token.json";

export const vibeTokenAbi = vibeTokenArtifact.abi as Abi;
export const vibeStakingAbi = vibeStakingArtifact.abi as Abi;
export const vibePredictionMarketAbi = vibePredictionMarketArtifact.abi as Abi;

// VIBE: Minimal ERC20 ABI for `transfer(to, amount)` so viem can encode it.
// (This project’s `vibe-token.json` ABI does not include `transfer`.)
export const vibeTokenTransferAbi = [
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// VIBE: Minimal ABI for `VibeTokenClaimer` (claim + status only).
// This avoids ABI mismatches like "Function 'transfer' not found on ABI".
export const claimerABI = [
  {
    inputs: [],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "hasClaimed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "CLAIM_AMOUNT",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const vibeTokenClaimerAbi = claimerABI as unknown as Abi;

const ARC_TESTNET_VIBE_TOKEN: Address =
  "0xE6e047F713023316bF7feE2F68Ef3aadF5456D5F";
const ARC_TESTNET_VIBE_STAKING: Address =
  "0xebae6fa1EeF51Ee54d1289dD7253DDC257Cd897b";
const ARC_TESTNET_VIBE_PREDICTION_MARKET: Address =
  "0x23a3304dDD34170792920F89Ab34c2533B9E975b";

const ARC_TESTNET_VIBE_TOKEN_CLAIMER: Address =
  "0x34DeCD0Fbfd9e42632904fb400e843B61aA16414";

export const VIBE_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_VIBE_TOKEN_ADDRESS ??
  ARC_TESTNET_VIBE_TOKEN) as Address;

export const VIBE_STAKING_ADDRESS = (process.env
  .NEXT_PUBLIC_VIBE_STAKING_ADDRESS ?? ARC_TESTNET_VIBE_STAKING) as Address;

export const VIBE_PREDICTION_MARKET_ADDRESS = (process.env
  .NEXT_PUBLIC_VIBE_PREDICTION_MARKET_ADDRESS ??
  ARC_TESTNET_VIBE_PREDICTION_MARKET) as Address;

/** @deprecated Use VIBE_TOKEN_ADDRESS — kept for gradual refactors */
export const CONTRACT_ADDRESSES = {
  vibeToken: VIBE_TOKEN_ADDRESS,
  vibeStaking: VIBE_STAKING_ADDRESS,
} as const;

export const vibeToken = {
  address: VIBE_TOKEN_ADDRESS,
  abi: vibeTokenAbi,
} as const;

export const vibeStaking = {
  address: VIBE_STAKING_ADDRESS,
  abi: vibeStakingAbi,
} as const;

export const vibePredictionMarket = {
  address: VIBE_PREDICTION_MARKET_ADDRESS,
  abi: vibePredictionMarketAbi,
} as const;

export const VIBE_TOKEN_CLAIMER_ADDRESS = (process.env
  .NEXT_PUBLIC_VIBE_TOKEN_CLAIMER_ADDRESS ?? ARC_TESTNET_VIBE_TOKEN_CLAIMER) as Address;

export const vibeTokenClaimer = {
  address: VIBE_TOKEN_CLAIMER_ADDRESS,
  abi: vibeTokenClaimerAbi,
} as const;

// SCALAR: Collateral token only — staking env is optional / legacy.
export function isContractConfigured(): boolean {
  const zero = "0x0000000000000000000000000000000000000000";
  return VIBE_TOKEN_ADDRESS !== zero;
}

export function isMarketsConfigured(): boolean {
  const zero = "0x0000000000000000000000000000000000000000";
  return VIBE_PREDICTION_MARKET_ADDRESS !== zero;
}

export function isClaimerConfigured(): boolean {
  const zero = "0x0000000000000000000000000000000000000000";
  return VIBE_TOKEN_CLAIMER_ADDRESS !== zero;
}

// SCALAR: prediction market + USDC (primary config lives in `lib/scalar.ts`)
export {
  DEFAULT_SCALAR_MARKET_ADDRESS,
  DEFAULT_SCALAR_USDC_ADDRESS,
  SCALAR_CHAIN_ID,
} from "./scalar-constants";
export {
  SCALAR_MARKET_ADDRESS,
  SCALAR_USDC_ADDRESS,
  isScalarConfigured,
  scalarMarket,
  scalarPredictionMarketAbi,
  scalarUsdc,
} from "./scalar";
