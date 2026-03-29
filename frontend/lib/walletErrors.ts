import { BaseError } from "wagmi";

// SCALAR: user-facing copy for common wagmi / wallet connector failures
export function formatWalletError(err: unknown): string {
  if (err instanceof BaseError) {
    const msg = err.shortMessage || err.message || "";
    const lower = msg.toLowerCase();
    if (
      lower.includes("user rejected") ||
      lower.includes("denied") ||
      lower.includes("cancelled") ||
      lower.includes("canceled")
    ) {
      return "Connection was cancelled.";
    }
    if (
      lower.includes("extension not found") ||
      lower.includes("metamask extension") ||
      lower.includes("please install metamask")
    ) {
      return "MetaMask wasn’t detected as the active injected wallet. Pick “Browser wallet” first (it uses MetaMask when it injects into the page), disable conflicting wallet extensions, or install MetaMask from metamask.io and refresh.";
    }
    if (
      lower.includes("walletconnect") ||
      lower.includes("project id") ||
      lower.includes("invalid project")
    ) {
      return "WalletConnect needs a valid project ID. Add NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID from https://cloud.reown.com to .env.local.";
    }
    return msg.length > 160 ? `${msg.slice(0, 157)}…` : msg;
  }
  if (err instanceof Error && err.message) {
    return err.message.length > 160
      ? `${err.message.slice(0, 157)}…`
      : err.message;
  }
  return "Could not connect. Try another wallet or reload the page.";
}
