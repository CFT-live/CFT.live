"use client";

import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TokenApproval } from "../types";
import { ApprovalRow } from "./ApprovalRow";

interface ApprovalTableProps {
  approvals: TokenApproval[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onRevoke?: () => void;
}

export function ApprovalTable({
  approvals,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearSelection,
  onRevoke,
}: Readonly<ApprovalTableProps>) {
  const t = useTranslations("revoke");
  const allSelected = approvals.length > 0 && approvals.every((a) => selectedIds.has(a.id));

  return (
    <div className="overflow-x-auto border border-border/50 rounded">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={allSelected ? onClearSelection : onSelectAll}
                className="w-4 h-4 rounded border-border bg-background accent-primary cursor-pointer"
                aria-label={allSelected ? t("deselect_all") : t("select_all")}
              />
            </TableHead>
            <TableHead>{t("col_token")}</TableHead>
            <TableHead>{t("col_spender")}</TableHead>
            <TableHead>{t("col_amount")}</TableHead>
            <TableHead>{t("col_risk")}</TableHead>
            <TableHead>{t("col_age")}</TableHead>
            <TableHead>{t("col_action")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {approvals.map((approval) => (
            <ApprovalRow
              key={approval.id}
              approval={approval}
              isSelected={selectedIds.has(approval.id)}
              onToggle={() => onToggle(approval.id)}
              onRevoke={onRevoke}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
