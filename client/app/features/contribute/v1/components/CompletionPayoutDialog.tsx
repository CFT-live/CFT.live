import { AlertCircle, CheckCircle2, ExternalLink, Loader2, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Feature } from "../api/types";
import type {
  CompletionBackendStatus,
  CompletionPayoutRow,
  CompletionPayoutStatus,
} from "../hooks/useCompleteFeatureWithPayouts";

type CompletionPayoutDialogProps = {
  canFinalize: boolean;
  completedCount: number;
  dialogError: string | null;
  dialogNotice: string | null;
  feature: Feature | null;
  isCompleting: boolean;
  isFinalized: boolean;
  isFinalizing: boolean;
  isPreparing: boolean;
  issues: string[];
  onFinalize: () => void;
  onOpenChange: (open: boolean) => void;
  onPayoutAll: () => void;
  onRetryPayout: (contributionId: string) => void;
  open: boolean;
  rows: CompletionPayoutRow[];
  runningContributionId: string | null;
  totalCount: number;
};

function getPayoutStatusBadgeVariant(status: CompletionPayoutStatus) {
  switch (status) {
    case "confirmed":
      return "success" as const;
    case "already-paid":
      return "warning" as const;
    case "failed":
      return "destructive" as const;
    case "in-progress":
      return "warning" as const;
    default:
      return "outline" as const;
  }
}

function getBackendStatusBadgeVariant(status: CompletionBackendStatus) {
  switch (status) {
    case "saved":
      return "success" as const;
    case "failed":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

function formatPayoutStatus(status: CompletionPayoutStatus) {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "already-paid":
      return "Already paid";
    case "failed":
      return "Failed";
    case "in-progress":
      return "Running";
    default:
      return "Ready";
  }
}

function formatBackendStatus(status: CompletionBackendStatus) {
  switch (status) {
    case "saved":
      return "Saved";
    case "failed":
      return "Failed";
    default:
      return "Pending";
  }
}

function truncateHash(hash: string | null) {
  if (!hash) return "-";
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function formatContributionKind(kind: CompletionPayoutRow["contribution"]["contribution_kind"]) {
  return kind === "REVIEW_REWARD" ? "Review reward" : "Original contribution";
}

function getActionLabel(status: CompletionPayoutStatus) {
  if (status === "failed") {
    return "Retry payout";
  }

  if (status === "confirmed") {
    return "Confirmed";
  }

  if (status === "already-paid") {
    return "Already paid";
  }

  return "Make payout";
}

export function CompletionPayoutDialog({
  canFinalize,
  completedCount,
  dialogError,
  dialogNotice,
  feature,
  isCompleting,
  isFinalized,
  isFinalizing,
  isPreparing,
  issues,
  onFinalize,
  onOpenChange,
  onPayoutAll,
  onRetryPayout,
  open,
  rows,
  runningContributionId,
  totalCount,
}: Readonly<CompletionPayoutDialogProps>) {
  const progressValue = totalCount === 0 ? 0 : completedCount;
  const hasRunnableRows = rows.some(
    (row) => row.payoutStatus === "ready" || row.payoutStatus === "failed",
  );
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <AlertDialogHeader className="border-b border-border/60 p-6 pb-4">
          <AlertDialogTitle className="font-mono uppercase tracking-wider">
            Complete Feature With Payouts
          </AlertDialogTitle>
          <AlertDialogDescription>
            Review each rewarded contribution, run on-chain payouts, and then update the backend once every payout is confirmed.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="overflow-y-auto px-6 py-4 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-wider">
                <Badge variant="outline">{feature?.name ?? "Feature"}</Badge>
                <Badge variant="secondary">Rewarded contributions: {totalCount}</Badge>
                <Badge variant="outline">Paid: {completedCount}/{totalCount}</Badge>
                {isFinalized ? <Badge variant="success">Backend completed</Badge> : null}
              </div>
              <Progress value={progressValue} max={Math.max(totalCount, 1)} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={onPayoutAll}
                disabled={!hasRunnableRows || isPreparing || isFinalizing || runningContributionId !== null}
              >
                {runningContributionId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing payout
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Run all payouts
                  </>
                )}
              </Button>
              <Button onClick={onFinalize} disabled={!canFinalize || isFinalizing}>
                {isFinalizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Finalizing
                  </>
                ) : (
                  "Mark feature completed"
                )}
              </Button>
            </div>
          </div>

          {isPreparing ? (
            <Alert>
              <Loader2 className="w-4 h-4 animate-spin" />
              <AlertTitle>Preparing payout plan</AlertTitle>
              <AlertDescription>
                Loading contribution rewards and calculating payout amounts.
              </AlertDescription>
            </Alert>
          ) : null}

          {dialogError ? (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Completion blocked</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap">
                {dialogError}
              </AlertDescription>
            </Alert>
          ) : null}

          {dialogNotice ? (
            <Alert>
              <CheckCircle2 className="w-4 h-4" />
              <AlertTitle>Completion updated</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap">
                {dialogNotice}
              </AlertDescription>
            </Alert>
          ) : null}

          {issues.length > 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Resolve payout issues first</AlertTitle>
              <AlertDescription>
                {issues.map((issue) => (
                  <p key={issue}>{issue}</p>
                ))}
              </AlertDescription>
            </Alert>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Contributor</TableHead>
                <TableHead>Contribution</TableHead>
                <TableHead>Payout Key</TableHead>
                <TableHead className="text-right">CP</TableHead>
                <TableHead className="text-right">Reward</TableHead>
                <TableHead>Payout</TableHead>
                <TableHead>Backend</TableHead>
                <TableHead>Tx Hash</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const isRowRunning = runningContributionId === row.contribution.id;
                const actionLabel = getActionLabel(row.payoutStatus);

                return (
                  <TableRow key={row.contribution.id}>
                    <TableCell className="max-w-[220px]">
                      <div className="truncate font-medium" title={row.task.name}>
                        {row.task.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.contributor.username}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {row.contributor.wallet_address.slice(0, 6)}...
                        {row.contributor.wallet_address.slice(-4)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline">{formatContributionKind(row.contribution.contribution_kind)}</Badge>
                        <div className="font-mono text-xs text-muted-foreground">
                          {row.contribution.id}
                        </div>
                        <a
                          href={row.contribution.submitted_work_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          Open
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {truncateHash(row.payoutKeyBytes32)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.cpAwarded}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-primary">
                      {row.tokenAmountDisplay} CFT
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPayoutStatusBadgeVariant(row.payoutStatus)}>
                        {formatPayoutStatus(row.payoutStatus)}
                      </Badge>
                      {row.errorMessage ? (
                        <div className="mt-1 max-w-[220px] whitespace-normal text-xs text-destructive">
                          {row.errorMessage}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getBackendStatusBadgeVariant(row.backendStatus)}>
                        {formatBackendStatus(row.backendStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.txHash ? (
                        <a
                          href={`https://arbiscan.io/tx/${row.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          {truncateHash(row.txHash)}
                        </a>
                      ) : (
                        truncateHash(row.txHash)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={
                          row.payoutStatus === "confirmed" || row.payoutStatus === "already-paid"
                            ? "outline"
                            : "default"
                        }
                        onClick={() => onRetryPayout(row.contribution.id)}
                        disabled={
                          isPreparing ||
                          isFinalizing ||
                          isRowRunning ||
                          row.payoutStatus === "confirmed" ||
                          row.payoutStatus === "already-paid" ||
                          isFinalized
                        }
                      >
                        {isRowRunning ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Running
                          </>
                        ) : (
                          actionLabel
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <AlertDialogFooter className="border-t border-border/60 p-6 pt-4">
          <AlertDialogCancel disabled={isCompleting}>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
