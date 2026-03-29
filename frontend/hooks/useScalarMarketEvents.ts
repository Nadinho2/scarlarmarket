"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useWatchContractEvent } from "wagmi";

import {
  SCALAR_MARKET_ADDRESS,
  scalarPredictionMarketAbi,
  isScalarConfigured,
} from "@/lib/scalar";

// SCALAR: Invalidate reads when the market contract emits
export function useScalarMarketEvents(enabled: boolean) {
  const queryClient = useQueryClient();
  const on = enabled && isScalarConfigured();

  const bump = () => {
    void queryClient.invalidateQueries();
  };

  useWatchContractEvent({
    address: SCALAR_MARKET_ADDRESS,
    abi: scalarPredictionMarketAbi,
    eventName: "MarketCreated",
    enabled: on,
    onLogs: bump,
  });

  useWatchContractEvent({
    address: SCALAR_MARKET_ADDRESS,
    abi: scalarPredictionMarketAbi,
    eventName: "BetPlaced",
    enabled: on,
    onLogs: bump,
  });

  useWatchContractEvent({
    address: SCALAR_MARKET_ADDRESS,
    abi: scalarPredictionMarketAbi,
    eventName: "MarketResolved",
    enabled: on,
    onLogs: bump,
  });

  useWatchContractEvent({
    address: SCALAR_MARKET_ADDRESS,
    abi: scalarPredictionMarketAbi,
    eventName: "WinningsClaimed",
    enabled: on,
    onLogs: bump,
  });
}
