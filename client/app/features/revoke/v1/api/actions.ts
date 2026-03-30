"use server";
// ---------- Internal types ----------

import { ARBISCAN_MAX_PAGES, ARBISCAN_API_BASE, ARBITRUM_CHAIN_ID, APPROVAL_TOPIC0, ARBISCAN_PAGE_SIZE, ARBITRUM_TOKEN_LIST_URL } from "../constants";

export interface ArbiscanLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  timeStamp: string;
  transactionHash: string;
}

export interface ApprovalPair {
  tokenAddress: `0x${string}`;
  spenderAddress: `0x${string}`;
  rawValue: bigint;
  blockNumber: bigint;
  timestamp: number;
  txHash: `0x${string}`;
}

export async function fetchApprovalLogs(
  address: `0x${string}`,
): Promise<ArbiscanLog[]> {
  const ownerTopic = `0x000000000000000000000000${address.slice(2).toLowerCase()}`;
  const all: ArbiscanLog[] = [];
  const apiKey = process.env.ARBISCAN_API_KEY ?? "";
  for (let page = 1; page <= ARBISCAN_MAX_PAGES; page++) {
    const url = new URL(ARBISCAN_API_BASE);
    url.searchParams.set("chainid", ARBITRUM_CHAIN_ID);
    url.searchParams.set("module", "logs");
    url.searchParams.set("action", "getLogs");
    url.searchParams.set("fromBlock", "0");
    url.searchParams.set("toBlock", "latest");
    url.searchParams.set("topic0", APPROVAL_TOPIC0);
    url.searchParams.set("topic0_1_opr", "and");
    url.searchParams.set("topic1", ownerTopic);
    url.searchParams.set("page", String(page));
    url.searchParams.set("offset", String(ARBISCAN_PAGE_SIZE));
    url.searchParams.set("apikey", apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Arbiscan API error: ${res.status}`);

    const json = (await res.json()) as { status: string; result: ArbiscanLog[] | string };
    if (!Array.isArray(json.result) || json.result.length === 0) break;
    all.push(...json.result);
    if (json.result.length < ARBISCAN_PAGE_SIZE) break;
  }
  return all;
}

 export async function fetchTokenLogoMap(): Promise<Record<string, string>> {
  try {
    const res = await fetch(ARBITRUM_TOKEN_LIST_URL);
    if (!res.ok) return {};
    const data = (await res.json()) as { tokens?: Array<{ address: string; logoURI: string }> };
    const m: Record<string, string> = {};
    for (const token of data.tokens ?? []) {
      m[token.address.toLowerCase()] = token.logoURI;
    }
    return m;
  } catch {
    return {};
  }
}
