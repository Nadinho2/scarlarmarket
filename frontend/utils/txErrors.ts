import { decodeErrorResult } from "viem";

import { vibePredictionMarketAbi } from "@/lib/contracts";
import { scalarPredictionMarketAbi } from "@/lib/scalar";

// SCALAR: `ScalarPredictionMarket` custom errors
const SCALAR_CUSTOM_ERROR_MESSAGES: Record<string, string> = {
  OwnableInvalidOwner: "Invalid owner configuration.",
  OwnableUnauthorizedAccount: "Only the contract owner can do this.",
  ReentrancyGuardReentrantCall: "Re-entrant call blocked — try again.",
  SafeERC20FailedOperation: "Token transfer failed — check balance and allowance.",
  Scalar__AlreadyClaimed: "You already claimed for this market.",
  Scalar__BettingClosed: "Betting is closed — the market ended or is resolved.",
  Scalar__EmptyQuestion: "Question cannot be empty.",
  Scalar__InvalidAmount: "Amount must be greater than zero.",
  Scalar__InvalidEndTime: "End time must be in the future.",
  Scalar__MarketAlreadyResolved: "This market is already resolved.",
  Scalar__MarketDoesNotExist: "This market does not exist.",
  Scalar__MarketNotResolved: "This market is not resolved yet.",
  Scalar__NothingToClaim: "Nothing to claim for this market.",
  Scalar__TradingNotClosed: "Trading is still open — wait until after the end time.",
  Scalar__ZeroAddress: "Invalid zero address in configuration.",
};

// VIBE: `VibePredictionMarketV2` custom errors (decoded before legacy Error(string)).
const V2_CUSTOM_ERROR_MESSAGES: Record<string, string> = {
  OnlyOwner: "Only the contract owner can do this.",
  MarketDoesNotExist: "This market does not exist.",
  MarketAlreadyResolved: "This market is already resolved.",
  InvalidEndTime: "End time must be in the future.",
  EmptyQuestion: "Question cannot be empty.",
  InvalidAmount: "Amount must be greater than zero.",
  ZeroAddress: "Invalid zero address in configuration.",
  MarketClosed: "This market is closed for new positions.",
  MarketNotEnded: "The market has not ended yet — wait until after the end time.",
  EmptyWinningSide: "Cannot resolve — the winning side has no liquidity.",
  MarketNotResolved: "This market is not resolved yet.",
  AlreadyClaimed: "You already claimed for this market.",
  NotWinner: "You have no stake on the winning side.",
  OwnableUnauthorizedAccount: "Only the contract owner can do this.",
  ReentrancyGuardReentrantCall: "Re-entrant call blocked — try again.",
  SafeERC20FailedOperation: "Token transfer failed — check balance and allowance.",
};

// VIBE: Solidity `require(msg, "VIBE: ...")` reverts as Error(string) — selector 0x08c379a0
const ERROR_STRING_ABI = [
  {
    type: "error",
    name: "Error",
    inputs: [{ name: "message", type: "string" }],
  },
] as const;

function findHexData(err: unknown, depth = 0): `0x${string}` | undefined {
  if (depth > 12 || err == null || typeof err !== "object") return undefined;
  const o = err as Record<string, unknown>;
  const data = o.data;
  if (
    typeof data === "string" &&
    data.startsWith("0x") &&
    data.length >= 10
  ) {
    return data as `0x${string}`;
  }
  const cause = o.cause;
  if (cause) return findHexData(cause, depth + 1);
  const details = o.details;
  if (typeof details === "string" && details.includes("0x")) {
    const m = details.match(/0x[a-fA-F0-9]+/);
    if (m?.[0] && m[0].length >= 10) return m[0] as `0x${string}`;
  }
  return undefined;
}

function friendlyVibeMessage(raw: string): string {
  const map: Record<string, string> = {
    "VIBE: market": "Invalid market id.",
    "VIBE: closed": "This market is closed for new positions.",
    "VIBE: resolved": "This market is already resolved.",
    "VIBE: amount": "Amount must be greater than zero.",
    "VIBE: endTime": "End time must be in the future.",
    "VIBE: question": "Question cannot be empty.",
    "VIBE: not ended":
      "Prediction period has not ended yet — wait until after the end time.",
    "VIBE: empty YES": "Cannot resolve YES — no YES liquidity.",
    "VIBE: empty NO": "Cannot resolve NO — no NO liquidity.",
    "VIBE: not resolved": "Market is not resolved yet.",
    "VIBE: claimed": "You already claimed winnings for this market.",
    "VIBE: not winner": "You have no stake on the winning side.",
    "VIBE: zero": "Invalid contract configuration.",
    "VIBE: reward token mismatch":
      "VibeToken must match VibeStaking.rewardToken — fees use rewardToken.transferFrom.",
    // VIBE: VibeTokenClaimer (one-time claim)
    "Already claimed": "You already claimed your one-time 100,000 VIBE.",
    "Insufficient balance in claimer":
      "The claimer contract is out of VIBE right now — ask the owner to deposit more.",
  };
  return map[raw] ?? raw;
}

/** Pull a human-readable revert reason from viem / wagmi / wallet errors. */
export function extractTxErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "string" && err.length > 0) return err.slice(0, 400);

  const hex = findHexData(err);
  if (hex) {
    try {
      const decodedScalar = decodeErrorResult({
        abi: scalarPredictionMarketAbi,
        data: hex,
      });
      const scalarMsg = SCALAR_CUSTOM_ERROR_MESSAGES[decodedScalar.errorName];
      if (scalarMsg) return scalarMsg;
    } catch {
      /* not a Scalar custom error */
    }
    try {
      const decodedV2 = decodeErrorResult({
        abi: vibePredictionMarketAbi,
        data: hex,
      });
      const v2msg = V2_CUSTOM_ERROR_MESSAGES[decodedV2.errorName];
      if (v2msg) return v2msg;
    } catch {
      /* not a V2 custom error */
    }
    try {
      const decoded = decodeErrorResult({
        abi: ERROR_STRING_ABI,
        data: hex,
      });
      if (decoded.errorName === "Error" && decoded.args) {
        const a = decoded.args as unknown;
        const msg = Array.isArray(a)
          ? a[0]
          : typeof a === "object" &&
              a !== null &&
              "message" in a &&
              typeof (a as { message: unknown }).message === "string"
            ? (a as { message: string }).message
            : undefined;
        if (typeof msg === "string") return friendlyVibeMessage(msg);
      }
    } catch {
      /* not Error(string) */
    }
  }

  if (err instanceof Error) {
    if (
      err.message &&
      err.message !== "Execution reverted for an unknown reason." &&
      !err.message.startsWith("User rejected")
    ) {
      return err.message.slice(0, 400);
    }
  }

  return fallback;
}
