"use client";

import { ExternalLink, ShieldAlert, ShieldCheck, ShieldHalf } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatUnits } from "viem";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Tooltip } from "@/components/ui/tooltip";
import type { RiskLevel, TokenApproval } from "../types";
import { useRevokeApproval } from "../hooks/useRevokeApproval";

const RISK_BADGE_VARIANT: Record<RiskLevel, "destructive" | "warning" | "green"> = {
  HIGH: "destructive",
  MEDIUM: "warning",
  LOW: "green",
};

const RISK_ICON: Record<RiskLevel, typeof ShieldAlert> = {
  HIGH: ShieldAlert,
  MEDIUM: ShieldHalf,
  LOW: ShieldCheck,
};

function formatAllowance(allowance: bigint, decimals: number, symbol: string): string {
  const formatted = formatUnits(allowance, decimals);
  const num = Number.parseFloat(formatted);
  const display = num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return `${display} ${symbol}`;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 86400 * 365) return `${Math.floor(diff / (86400 * 30))}mo ago`;
  return `${Math.floor(diff / (86400 * 365))}y ago`;
}

function ArbiscanAddress({ address }: Readonly<{ address: `0x${string}` }>) {
  return (
    <a
      href={`https://arbiscan.io/address/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
    >
      {address.slice(0, 6)}…{address.slice(-4)}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}

interface ApprovalRowProps {
  approval: TokenApproval;
  isSelected: boolean;
  onToggle: () => void;
  onRevoke?: () => void;
}

export function ApprovalRow({ approval, isSelected, onToggle, onRevoke }: Readonly<ApprovalRowProps>) {
  const t = useTranslations("revoke");
  const { revoke, isPending } = useRevokeApproval(onRevoke);

  const RiskIcon = RISK_ICON[approval.riskLevel];
  const riskLabel: Record<RiskLevel, string> = {
    HIGH: t("risk_high"),
    MEDIUM: t("risk_medium"),
    LOW: t("risk_low"),
  };
  const riskExpl: Record<RiskLevel, string> = {
    HIGH: t("risk_explanation_high"),
    MEDIUM: t("risk_explanation_medium"),
    LOW: t("risk_explanation_low"),
  };

  return (
    <TableRow className={isSelected ? "bg-primary/5" : undefined}>
      <TableCell className="w-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="w-4 h-4 rounded border-border bg-background accent-primary cursor-pointer"
          aria-label="Select for batch revoke"
        />
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2 min-w-0">
          {approval.tokenLogoURI ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={approval.tokenLogoURI}
              alt={approval.tokenSymbol}
              className="w-6 h-6 rounded-full shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-mono font-bold text-primary shrink-0">
              {approval.tokenSymbol.slice(0, 2)}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-mono font-bold text-sm">{approval.tokenSymbol}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[100px]">
              {approval.tokenName}
            </div>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <div className="flex flex-col gap-0.5">
          {approval.spenderLabel ? (
            <span className="font-mono text-sm">{approval.spenderLabel}</span>
          ) : (
            <span className="font-mono text-sm text-orange-400">{t("unknown_spender")}</span>
          )}
          <ArbiscanAddress address={approval.spenderAddress} />
        </div>
      </TableCell>

      <TableCell>
        {approval.isUnlimited ? (
          <Badge variant="destructive">{t("unlimited")}</Badge>
        ) : (
          <span className="font-mono text-sm">
            {formatAllowance(approval.allowance, approval.tokenDecimals, approval.tokenSymbol)}
          </span>
        )}
      </TableCell>

      <TableCell>
        <Tooltip content={riskExpl[approval.riskLevel]}>
          <Badge variant={RISK_BADGE_VARIANT[approval.riskLevel]}>
            <RiskIcon className="w-3 h-3" />
            {riskLabel[approval.riskLevel]}
          </Badge>
        </Tooltip>
      </TableCell>

      <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
        {formatTimeAgo(approval.timestamp)}
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => revoke(approval)}
            disabled={isPending}
            className="font-mono text-xs"
          >
            {isPending ? t("revoking") : t("revoke")}
          </Button>
          <a
            href={`https://arbiscan.io/tx/${approval.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
            aria-label={t("tx_view")}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </TableCell>
    </TableRow>
  );
}
