"use client";

import { useMemo } from "react";
import { useAccount, useBlock, useReadContract, useReadContracts } from "wagmi";

import {
  scalarPredictionMarketAbi,
  SCALAR_MARKET_ADDRESS,
  isScalarConfigured,
} from "@/lib/scalar";
import { arcTestnet } from "@/lib/web3";

// SCALAR: Mirrors `getMarket` tuple from `ScalarPredictionMarket`
export type ScalarMarketStruct = {
  question: string;
  endTime: bigint;
  category: string;
  creator: `0x${string}`;
  resolved: boolean;
  outcomeIsYes: boolean;
  totalYes: bigint;
  totalNo: bigint;
};

export type ScalarMarketRow = {
  id: bigint;
  market: ScalarMarketStruct;
  userYes: bigint;
  userNo: bigint;
  claimed: boolean;
};

// SCALAR: chain time only — never wall clock (testnets lag; Date.now() hid open markets / trending)
export function useScalarChainNow(): bigint | undefined {
  const { data: block } = useBlock({
    chainId: arcTestnet.id,
    watch: true,
  });
  return block?.timestamp;
}

export function useScalarMarketOwner() {
  return useReadContract({
    address: SCALAR_MARKET_ADDRESS,
    abi: scalarPredictionMarketAbi,
    functionName: "owner",
    query: {
      enabled: isScalarConfigured(),
      refetchInterval: 20_000,
    },
  });
}

export function useScalarMarkets() {
  const { address } = useAccount();
  const now = useScalarChainNow();

  const {
    data: marketCount,
    isPending: countPending,
    refetch: refetchCount,
  } = useReadContract({
    address: SCALAR_MARKET_ADDRESS,
    abi: scalarPredictionMarketAbi,
    functionName: "marketCount",
    query: {
      enabled: isScalarConfigured(),
      refetchInterval: 12_000,
    },
  });

  const n = marketCount !== undefined ? Number(marketCount) : 0;

  const marketContracts = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        address: SCALAR_MARKET_ADDRESS,
        abi: scalarPredictionMarketAbi,
        functionName: "getMarket" as const,
        args: [BigInt(i)] as const,
      })),
    [n],
  );

  const {
    data: marketResults,
    isPending: marketsPending,
    refetch: refetchMarkets,
  } = useReadContracts({
    contracts: marketContracts,
    query: {
      enabled: isScalarConfigured() && n > 0,
    },
  });

  const betContracts = useMemo(
    () =>
      address && n > 0
        ? Array.from({ length: n }, (_, i) => ({
            address: SCALAR_MARKET_ADDRESS,
            abi: scalarPredictionMarketAbi,
            functionName: "getUserBet" as const,
            args: [BigInt(i), address] as const,
          }))
        : [],
    [n, address],
  );

  const claimedContracts = useMemo(
    () =>
      address && n > 0
        ? Array.from({ length: n }, (_, i) => ({
            address: SCALAR_MARKET_ADDRESS,
            abi: scalarPredictionMarketAbi,
            functionName: "claimed" as const,
            args: [BigInt(i), address] as const,
          }))
        : [],
    [n, address],
  );

  const { data: betResults, refetch: refetchBets } = useReadContracts({
    contracts: betContracts,
    query: {
      enabled: !!address && isScalarConfigured() && n > 0,
    },
  });

  const { data: claimedResults, refetch: refetchClaimed } = useReadContracts({
    contracts: claimedContracts,
    query: {
      enabled: !!address && isScalarConfigured() && n > 0,
    },
  });

  const rows: ScalarMarketRow[] = useMemo(() => {
    if (!marketResults || n === 0) return [];
    const out: ScalarMarketRow[] = [];
    for (let i = 0; i < n; i++) {
      const mr = marketResults[i];
      if (!mr || mr.status !== "success" || mr.result == null) continue;
      const market = mr.result as ScalarMarketStruct;
      const betR = betResults?.[i];
      let userYes = 0n;
      let userNo = 0n;
      if (betR?.status === "success" && Array.isArray(betR.result)) {
        userYes = betR.result[0] as bigint;
        userNo = betR.result[1] as bigint;
      }
      const clR = claimedResults?.[i];
      const claimed =
        clR?.status === "success" && typeof clR.result === "boolean"
          ? clR.result
          : false;
      out.push({
        id: BigInt(i),
        market,
        userYes,
        userNo,
        claimed,
      });
    }
    return out.sort((a, b) => {
      const va = volume(a.market);
      const vb = volume(b.market);
      if (va > vb) return -1;
      if (va < vb) return 1;
      return Number(b.id - a.id);
    });
  }, [marketResults, betResults, claimedResults, n]);

  const refetchAll = async () => {
    await refetchCount();
    await refetchMarkets();
    await refetchBets();
    await refetchClaimed();
  };

  return {
    marketCount,
    rows,
    now,
    isLoading: countPending || (n > 0 && marketsPending),
    refetchAll,
  };
}

function volume(m: ScalarMarketStruct): bigint {
  return m.totalYes + m.totalNo;
}
