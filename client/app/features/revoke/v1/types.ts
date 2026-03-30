export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

export type BatchRevokeStatus = "pending" | "confirming" | "confirmed" | "failed";

export type SortField = "riskLevel" | "tokenSymbol" | "allowance" | "age";

export type SortDirection = "asc" | "desc";

export interface TokenApproval {
  id: string;
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
  tokenName: string;
  tokenDecimals: number;
  tokenLogoURI?: string;
  spenderAddress: `0x${string}`;
  spenderLabel?: string;
  allowance: bigint;
  isUnlimited: boolean;
  blockNumber: bigint;
  timestamp: number;
  txHash: `0x${string}`;
  riskLevel: RiskLevel;
}

export interface ApprovalsFilter {
  searchQuery: string;
  riskLevel: RiskLevel | "ALL";
  sortField: SortField;
  sortDirection: SortDirection;
}

export interface BatchRevokeItem {
  approval: TokenApproval;
  status: BatchRevokeStatus;
  errorMessage?: string;
  txHash?: `0x${string}`;
}
