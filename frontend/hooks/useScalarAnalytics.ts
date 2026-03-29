"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { parseAbiItem } from "viem";
import { usePublicClient, useReadContract } from "wagmi";

import { useScalarMarkets } from "@/hooks/useScalarMarkets";
import {
  scalarPredictionMarketAbi,
  SCALAR_MARKET_ADDRESS,
  isScalarConfigured,
} from "@/lib/scalar";
import { arcTestnet } from "@/lib/web3";

// SCALAR: design enhancement — chain logs for unique wallets (creators + bettors)
const marketCreatedEvent = parseAbiItem(
  "event MarketCreated(uint256 indexed marketId, address indexed creator, string question, uint256 endTime, string category)",
);
const betPlacedEvent = parseAbiItem(
  "event BetPlaced(uint256 indexed marketId, address indexed user, bool isYes, uint256 usdcAmount)",
);

export function useScalarAnalytics() {
  const publicClient = usePublicClient({ chainId: arcTestnet.id });
  const { rows, now, marketCount, isLoading: marketsLoading } = useScalarMarkets();

  const { data: platformFeeBps } = useReadContract({
    address: SCALAR_MARKET_ADDRESS,
    abi: scalarPredictionMarketAbi,
    functionName: "PLATFORM_FEE_BPS",
    query: { enabled: isScalarConfigured() },
  });
  const { data: bpsDenom } = useReadContract({
    address: SCALAR_MARKET_ADDRESS,
    abi: scalarPredictionMarketAbi,
    functionName: "BPS_DENOM",
    query: { enabled: isScalarConfigured() },
  });

  const bps = typeof platformFeeBps === "bigint" ? platformFeeBps : 150n;
  const denom = typeof bpsDenom === "bigint" ? bpsDenom : 10000n;

  const creatorsOnlyCount = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) s.add(r.market.creator.toLowerCase());
    return s.size;
  }, [rows]);

  const derived = useMemo(() => {
    let totalVolume = 0n;
    let activeMarkets = 0;
    let resolvedMarkets = 0;
    let platformFeesCollected = 0n;
    for (const r of rows) {
      const m = r.market;
      const pot = m.totalYes + m.totalNo;
      totalVolume += pot;
      if (m.resolved) {
        resolvedMarkets++;
        platformFeesCollected += (pot * bps) / denom;
      } else if (now !== undefined && now <= m.endTime) {
        activeMarkets++;
      }
    }
    const totalMarkets =
      marketCount !== undefined ? Number(marketCount) : rows.length;
    return {
      totalVolume,
      activeMarkets,
      resolvedMarkets,
      platformFeesCollected,
      totalMarkets,
    };
  }, [rows, now, marketCount, bps, denom]);

  const {
    data: uniqueUsersFromLogs,
    isPending: usersPending,
    isError: usersError,
  } = useQuery({
    queryKey: ["scalar-analytics-unique-users", SCALAR_MARKET_ADDRESS],
    queryFn: async () => {
      if (!publicClient) throw new Error("No RPC client");
      const latest = await publicClient.getBlockNumber();
      const [betLogs, marketLogs] = await Promise.all([
        publicClient.getLogs({
          address: SCALAR_MARKET_ADDRESS,
          event: betPlacedEvent,
          fromBlock: 0n,
          toBlock: latest,
        }),
        publicClient.getLogs({
          address: SCALAR_MARKET_ADDRESS,
          event: marketCreatedEvent,
          fromBlock: 0n,
          toBlock: latest,
        }),
      ]);
      const set = new Set<string>();
      for (const l of marketLogs) {
        const c = l.args.creator;
        if (typeof c === "string") set.add(c.toLowerCase());
      }
      for (const l of betLogs) {
        const u = l.args.user;
        if (typeof u === "string") set.add(u.toLowerCase());
      }
      return set.size;
    },
    enabled: !!publicClient && isScalarConfigured(),
    staleTime: 120_000,
  });

  const uniqueUsersFromChain =
    typeof uniqueUsersFromLogs === "number" ? uniqueUsersFromLogs : null;
  const uniqueUsersDisplay =
    uniqueUsersFromChain !== null ? uniqueUsersFromChain : creatorsOnlyCount;
  /** True when RPC log scan failed — UI shows creators-only minimum */
  const uniqueUsersFallback = usersError;

  return {
    ...derived,
    uniqueUsers: uniqueUsersDisplay,
    uniqueUsersFallback,
    /** True while fetching event-based unique count */
    uniqueUsersPending: usersPending && uniqueUsersFromChain === null,
    creatorsOnlyCount,
    isLoading: marketsLoading,
  };
}
