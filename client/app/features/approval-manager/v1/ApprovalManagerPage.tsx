"use client";

import { useCallback, useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useTranslations } from "next-intl";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApprovalsFilter, RiskLevel, TokenApproval } from "./types";
import { useApprovals } from "./hooks/useApprovals";
import { useBatchRevoke } from "./hooks/useBatchRevoke";
import { ScanStatus } from "./components/ScanStatus";
import { ApprovalFilters } from "./components/ApprovalFilters";
import { ApprovalTable } from "./components/ApprovalTable";
import { BatchRevokeDialog } from "./components/BatchRevokeDialog";

const DEFAULT_FILTER: ApprovalsFilter = {
  searchQuery: "",
  riskLevel: "ALL",
  sortField: "riskLevel",
  sortDirection: "desc",
};

const RISK_SCORE: Record<RiskLevel, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

function applyFilter(approvals: TokenApproval[], filter: ApprovalsFilter): TokenApproval[] {
  let result = approvals;

  if (filter.searchQuery) {
    const q = filter.searchQuery.toLowerCase();
    result = result.filter(
      (a) =>
        a.tokenSymbol.toLowerCase().includes(q) ||
        a.tokenName.toLowerCase().includes(q) ||
        a.tokenAddress.toLowerCase().includes(q) ||
        (a.spenderLabel ?? "").toLowerCase().includes(q) ||
        a.spenderAddress.toLowerCase().includes(q),
    );
  }

  if (filter.riskLevel !== "ALL") {
    result = result.filter((a) => a.riskLevel === filter.riskLevel);
  }

  const dir = filter.sortDirection === "asc" ? 1 : -1;
  return [...result].sort((a, b) => {
    switch (filter.sortField) {
      case "riskLevel":
        return (RISK_SCORE[b.riskLevel] - RISK_SCORE[a.riskLevel]) * dir;
      case "tokenSymbol":
        return a.tokenSymbol.localeCompare(b.tokenSymbol) * dir;
      case "allowance":
        return (a.allowance > b.allowance ? 1 : -1) * dir;
      case "age":
        return (a.timestamp - b.timestamp) * dir;
      default:
        return 0;
    }
  });
}

export default function ApprovalManagerPage() {
  const t = useTranslations("revoke");
  const { address, isConnected } = useAppKitAccount();
  const [filter, setFilter] = useState<ApprovalsFilter>(DEFAULT_FILTER);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { approvals, isLoading, error, refetch } = useApprovals(
    address as `0x${string}` | undefined,
  );
  const { start, items, isRunning, dialogOpen, setDialogOpen } = useBatchRevoke(refetch);

  const filtered = useMemo(() => applyFilter(approvals, filter), [approvals, filter]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filtered.map((a) => a.id)));
  }, [filtered]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectedApprovals = useMemo(
    () => filtered.filter((a) => selectedIds.has(a.id)),
    [filtered, selectedIds],
  );

  const handleBatchRevoke = useCallback(() => {
    if (selectedApprovals.length > 0) start(selectedApprovals);
  }, [selectedApprovals, start]);

  const showContent = isConnected && !isLoading && !error && approvals.length > 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl">
      <div className="flex items-start gap-3">
        <Shield className="w-6 h-6 text-primary mt-0.5 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold font-mono text-primary">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
        </div>
      </div>

      <ScanStatus
        isConnected={isConnected}
        isLoading={isLoading}
        error={error as Error | null}
        approvals={approvals}
        onRescan={refetch}
      />

      {showContent && (
        <>
          <ApprovalFilters filter={filter} onChange={setFilter} />

          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between rounded border border-primary/30 bg-primary/5 px-4 py-2 gap-4">
              <span className="text-sm font-mono text-primary">
                {t("selected_count", { count: selectedIds.size })}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearSelection}
                  className="font-mono text-xs"
                >
                  {t("deselect_all")}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBatchRevoke}
                  className="font-mono text-xs"
                >
                  {t("batch_revoke")} ({selectedIds.size})
                </Button>
              </div>
            </div>
          )}

          <ApprovalTable
            approvals={filtered}
            selectedIds={selectedIds}
            onToggle={toggleSelect}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onRevoke={refetch}
          />
        </>
      )}

      <BatchRevokeDialog
        open={dialogOpen}
        items={items}
        isRunning={isRunning}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
