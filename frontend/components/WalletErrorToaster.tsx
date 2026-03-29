"use client";

import { useEffect, useRef } from "react";
import { useConnect } from "wagmi";
import { toast } from "sonner";

import { formatWalletError } from "@/lib/walletErrors";

// SCALAR: surface wagmi connect failures (Rainbow modal uses the same mutation)
export function WalletErrorToaster() {
  const { error, reset } = useConnect();
  const prev = useRef<typeof error>(undefined);

  useEffect(() => {
    if (!error || error === prev.current) return;
    prev.current = error;
    toast.error(formatWalletError(error), {
      duration: 8000,
      id: "wallet-connect-error",
    });
    reset();
  }, [error, reset]);

  return null;
}
