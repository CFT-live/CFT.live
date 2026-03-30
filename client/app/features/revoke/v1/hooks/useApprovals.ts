"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReadContracts } from "wagmi";
import { erc20Abi } from "@/app/lib/contracts";
import type { RiskLevel, TokenApproval } from "../types";
import {
  UNLIMITED_THRESHOLD,
  ALL_KNOWN_SPENDERS,
  CFT_SPENDER_ADDRESSES,
  KNOWN_TOKENS,
} from "../constants";
import { ApprovalPair, ArbiscanLog, fetchApprovalLogs, fetchTokenLogoMap } from "../api/actions";

// ---------- Hook ----------

export function useApprovals(address: `0x${string}` | undefined) {
  const { data: rawLogs, isLoading: logsLoading, error, refetch: refetchLogs } = useQuery({
    queryKey: ["approvalLogs", address],
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    queryFn: () => fetchApprovalLogs(address as `0x${string}`),
    enabled: !!address,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  const pairs = useMemo(() => (rawLogs ? parseApprovalLogs(rawLogs) : []), [rawLogs]);

  const uniqueTokens = useMemo(
    () => [...new Set(pairs.map((p) => p.tokenAddress))],
    [pairs],
  );

  const { data: allowancesData, isLoading: allowancesLoading, refetch: refetchAllowances } = useReadContracts({
    contracts: pairs.map((p) => ({
      address: p.tokenAddress,
      abi: erc20Abi,
      functionName: "allowance" as const,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      args: [address as `0x${string}`, p.spenderAddress],
    })),
    query: { enabled: pairs.length > 0 && !!address },
  });

  const { data: symbolsData } = useReadContracts({
    contracts: uniqueTokens.map((addr) => ({
      address: addr,
      abi: erc20Abi,
      functionName: "symbol" as const,
    })),
    query: { enabled: uniqueTokens.length > 0 },
  });

  const { data: namesData } = useReadContracts({
    contracts: uniqueTokens.map((addr) => ({
      address: addr,
      abi: erc20Abi,
      functionName: "name" as const,
    })),
    query: { enabled: uniqueTokens.length > 0 },
  });

  const { data: decimalsData } = useReadContracts({
    contracts: uniqueTokens.map((addr) => ({
      address: addr,
      abi: erc20Abi,
      functionName: "decimals" as const,
    })),
    query: { enabled: uniqueTokens.length > 0 },
  });

  const { data: tokenLogoMap = {} } = useQuery({
    queryKey: ["arbitrumTokenList"],
    queryFn: fetchTokenLogoMap,
    staleTime: 24 * 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
  });

  const tokenMeta = useMemo(() => {
    const m: Record<string, { symbol: string; name: string; decimals: number }> = {};
    uniqueTokens.forEach((addr, i) => {
      const key = addr.toLowerCase();
      const known = KNOWN_TOKENS[key];
      m[key] = {
        symbol: (symbolsData?.[i]?.result as string | undefined) ?? known?.symbol ?? "???",
        name: (namesData?.[i]?.result as string | undefined) ?? known?.name ?? addr,
        decimals: (decimalsData?.[i]?.result as number | undefined) ?? known?.decimals ?? 18,
      };
    });
    return m;
  }, [uniqueTokens, symbolsData, namesData, decimalsData]);

  const approvals = useMemo<TokenApproval[]>(() => {
    if (!allowancesData && pairs.length > 0) return [];

    return pairs.reduce<TokenApproval[]>((acc, pair, i) => {
      const allowance = (allowancesData?.[i]?.result as bigint | undefined) ?? pair.rawValue;
      if (allowance === BigInt(0)) return acc;

      const tokenKey = pair.tokenAddress.toLowerCase();
      const meta = tokenMeta[tokenKey] ?? { symbol: "???", name: pair.tokenAddress, decimals: 18 };
      const isUnlimited = allowance >= UNLIMITED_THRESHOLD;
      const spenderKey = pair.spenderAddress.toLowerCase();
      const spenderLabel = ALL_KNOWN_SPENDERS[spenderKey];
      const riskLevel: RiskLevel = CFT_SPENDER_ADDRESSES.has(spenderKey)
        ? "LOW"
        : getRiskLevel(isUnlimited, spenderLabel);

      acc.push({
        id: `${tokenKey}-${pair.spenderAddress.toLowerCase()}`,
        tokenAddress: pair.tokenAddress,
        tokenSymbol: meta.symbol,
        tokenName: meta.name,
        tokenDecimals: meta.decimals,
        tokenLogoURI: tokenLogoMap[tokenKey],
        spenderAddress: pair.spenderAddress,
        spenderLabel,
        allowance,
        isUnlimited,
        blockNumber: pair.blockNumber,
        timestamp: pair.timestamp,
        txHash: pair.txHash,
        riskLevel,
      });
      return acc;
    }, []);
  }, [pairs, allowancesData, tokenMeta, tokenLogoMap]);

  const isLoading = logsLoading || (pairs.length > 0 && allowancesLoading);

  const refetch = useCallback(async () => {
    await refetchLogs();
    await refetchAllowances();
  }, [refetchLogs, refetchAllowances]);

  return { approvals, isLoading, error, refetch };
}


// ---------- helpers ----------

 function getRiskLevel(isUnlimited: boolean, spenderLabel: string | undefined): RiskLevel {
  if (isUnlimited && !spenderLabel) return "HIGH";
  if (isUnlimited || !spenderLabel) return "MEDIUM";
  return "LOW";
}

export function parseApprovalLogs(logs: ArbiscanLog[]): ApprovalPair[] {
  const map = new Map<string, ApprovalPair>();

  for (const log of logs) {
    if (log.topics.length < 3) continue;

    const tokenAddress = `0x${log.address.slice(2).toLowerCase()}` as unknown as `0x${string}`;
    const spenderAddress = `0x${log.topics[2].slice(26).toLowerCase()}` as unknown as `0x${string}`;
    const key = `${tokenAddress}-${spenderAddress}`;

    const blockNumber = BigInt(log.blockNumber);
    const existing = map.get(key);
    if (existing && blockNumber < existing.blockNumber) continue;

    let rawValue = BigInt(0);
    try {
      if (log.data && log.data !== "0x") rawValue = BigInt(log.data);
    } catch { /* ignore malformed data */ }

    const ts = log.timeStamp.startsWith("0x")
      ? Number.parseInt(log.timeStamp, 16)
      : Number.parseInt(log.timeStamp, 10);

    map.set(key, {
      tokenAddress,
      spenderAddress,
      rawValue,
      blockNumber,
      timestamp: ts,
      txHash: log.transactionHash as `0x${string}`,
    });
  }

  return Array.from(map.values());
}