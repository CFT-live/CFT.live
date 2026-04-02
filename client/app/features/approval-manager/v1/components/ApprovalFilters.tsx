"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApprovalsFilter, RiskLevel, SortField } from "../types";

interface ApprovalFiltersProps {
  filter: ApprovalsFilter;
  onChange: (filter: ApprovalsFilter) => void;
}

export function ApprovalFilters({ filter, onChange }: Readonly<ApprovalFiltersProps>) {
  const t = useTranslations("revoke");

  const set = (patch: Partial<ApprovalsFilter>) => onChange({ ...filter, ...patch });

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={t("filter_placeholder")}
          value={filter.searchQuery}
          onChange={(e) => set({ searchQuery: e.target.value })}
          className="pl-9 font-mono text-sm"
        />
      </div>

      <Select
        value={filter.riskLevel}
        onValueChange={(v) => set({ riskLevel: v as RiskLevel | "ALL" })}
      >
        <SelectTrigger className="w-full sm:w-44 font-mono text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("filter_risk_all")}</SelectItem>
          <SelectItem value="HIGH">{t("filter_risk_high")}</SelectItem>
          <SelectItem value="MEDIUM">{t("filter_risk_medium")}</SelectItem>
          <SelectItem value="LOW">{t("filter_risk_low")}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filter.sortField}
        onValueChange={(v) => set({ sortField: v as SortField })}
      >
        <SelectTrigger className="w-full sm:w-40 font-mono text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="riskLevel">{t("sort_risk")}</SelectItem>
          <SelectItem value="tokenSymbol">{t("sort_token")}</SelectItem>
          <SelectItem value="allowance">{t("sort_amount")}</SelectItem>
          <SelectItem value="age">{t("sort_age")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
