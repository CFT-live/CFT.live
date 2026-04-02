"use client";

import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BatchRevokeItem, BatchRevokeStatus } from "../types";

function StatusIcon({ status }: Readonly<{ status: BatchRevokeStatus }>) {
  if (status === "confirmed") return <CheckCircle2 className="w-4 h-4 text-primary" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-destructive" />;
  if (status === "confirming") return <Loader2 className="w-4 h-4 animate-spin text-orange-400" />;
  return <div className="w-4 h-4 rounded-full border border-muted-foreground/40" />;
}

function statusBadgeVariant(status: BatchRevokeStatus) {
  if (status === "confirmed") return "success" as const;
  if (status === "failed") return "destructive" as const;
  if (status === "confirming") return "warning" as const;
  return "outline" as const;
}

interface BatchRevokeDialogProps {
  open: boolean;
  items: BatchRevokeItem[];
  isRunning: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BatchRevokeDialog({
  open,
  items,
  isRunning,
  onOpenChange,
}: Readonly<BatchRevokeDialogProps>) {
  const t = useTranslations("revoke");

  const confirmed = items.filter((i) => i.status === "confirmed").length;
  const progress = items.length === 0 ? 0 : Math.round((confirmed / items.length) * 100);

  const statusLabel: Record<BatchRevokeStatus, string> = {
    pending: t("batch_status_pending"),
    confirming: t("batch_status_confirming"),
    confirmed: t("batch_status_confirmed"),
    failed: t("batch_status_failed"),
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-mono">{t("batch_revoke_title")}</AlertDialogTitle>
          <AlertDialogDescription className="font-mono text-xs">
            {t("batch_progress", { done: confirmed, total: items.length })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Progress value={progress} className="mb-2" />

        <div className="max-h-64 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>{t("col_token")}</TableHead>
                <TableHead>{t("col_spender")}</TableHead>
                <TableHead>{t("col_risk")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.approval.id}>
                  <TableCell>
                    <StatusIcon status={item.status} />
                  </TableCell>
                  <TableCell className="font-mono text-sm font-bold">
                    {item.approval.tokenSymbol}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.approval.spenderLabel ??
                      `${item.approval.spenderAddress.slice(0, 8)}…`}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <Badge
                        variant={statusBadgeVariant(item.status)}
                        className="font-mono text-[10px] w-fit"
                      >
                        {statusLabel[item.status]}
                      </Badge>
                      {item.errorMessage && (
                        <p
                          className="text-[10px] text-destructive max-w-[140px] truncate"
                          title={item.errorMessage}
                        >
                          {item.errorMessage}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.txHash && (
                      <a
                        href={`https://arbiscan.io/tx/${item.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                        aria-label={t("tx_view")}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRunning} className="font-mono text-xs">
            {isRunning ? t("batch_cancel") : t("batch_close")}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
