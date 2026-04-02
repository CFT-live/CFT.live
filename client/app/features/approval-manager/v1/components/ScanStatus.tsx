"use client";

import { ShieldCheck, WifiOff, AlertTriangle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { TokenApproval } from "../types";

interface ScanStatusProps {
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  approvals: TokenApproval[];
  onRescan: () => void;
}

export function ScanStatus({
  isConnected,
  isLoading,
  error,
  approvals,
  onRescan,
}: Readonly<ScanStatusProps>) {
  const t = useTranslations("revoke");

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <WifiOff className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-lg font-mono font-bold text-primary">{t("connect_wallet")}</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t("connect_wallet_description")}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm font-mono text-muted-foreground">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          {t("scanning")}
        </div>
        {(["a", "b", "c", "d", "e"]).map((k) => (
          <Skeleton key={k} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="w-4 h-4" />
        <AlertTitle>{t("error_title")}</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span className="text-xs break-all">{error.message}</span>
          <Button size="sm" variant="outline" onClick={onRescan} className="shrink-0">
            <RefreshCw className="w-3 h-3 mr-1" />
            {t("rescan")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (approvals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
        <ShieldCheck className="w-12 h-12 text-primary" />
        <h2 className="text-lg font-mono font-bold text-primary">{t("no_approvals_title")}</h2>
        <p className="text-sm text-muted-foreground">{t("no_approvals_description")}</p>
        <Button size="sm" variant="outline" onClick={onRescan} className="font-mono text-xs">
          <RefreshCw className="w-3 h-3 mr-1" />
          {t("rescan")}
        </Button>
      </div>
    );
  }

  const highRisk = approvals.filter((a) => a.riskLevel === "HIGH").length;

  return (
    <div className="flex items-center gap-4 flex-wrap rounded border border-border/50 bg-card/30 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-mono">
        <div className="w-2 h-2 bg-primary rounded-full" />
        <span>{t("approvals_summary", { count: approvals.length })}</span>
        {highRisk > 0 && (
          <span className="text-destructive font-bold">
            — {t("high_risk_warn", { count: highRisk })}
          </span>
        )}
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={onRescan}
        className="ml-auto font-mono text-xs"
      >
        <RefreshCw className="w-3 h-3 mr-1" />
        {t("rescan")}
      </Button>
    </div>
  );
}
