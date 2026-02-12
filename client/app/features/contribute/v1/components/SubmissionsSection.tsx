import { useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import type { Contribution, Task } from "../api/types";
import { approveContribution } from "../api/api";

type PublicContributor = {
  id: string;
  wallet_address: string;
  username: string;
  github_username: string | null;
  telegram_handle: string | null;
  roles: string[];
  status: string;
};

type SubmissionsSectionProps = {
  contributions: Contribution[];
  contributorsById: Record<string, PublicContributor>;
  taskById: Map<string, Task>;
  isAdmin: boolean;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
};

export function SubmissionsSection({
  contributions,
  contributorsById,
  taskById,
  isAdmin,
  loading,
  onRefresh,
  onError,
  onSuccess,
}: SubmissionsSectionProps) {
  const { address } = useAppKitAccount();
  const [reviewCp, setReviewCp] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const handleApprove = async (
    contributionId: string,
    status: Contribution["status"],
    cpAwarded: number | null,
    approvalNotes: string | null,
  ) => {
    if (!address) {
      onError("Connect wallet to review");
      return;
    }

    try {
      await approveContribution({
        contribution_id: contributionId,
        status,
        cp_awarded: cpAwarded,
        approval_notes: approvalNotes,
      });
      await onRefresh();
      const successMessages = {
        APPROVED: `Contribution approved with ${cpAwarded} CP!`,
        CHANGES_REQUESTED: "Changes requested successfully!",
        REJECTED: "Contribution rejected!",
      };
      onSuccess(
        successMessages[status as keyof typeof successMessages] ||
          "Status updated!",
      );
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Card className="p-4 border border-border/60 bg-background/60">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-mono font-semibold uppercase tracking-wider">
          <span>{">"}</span> Submissions{" "}
        </h2>
      </div>
      <p className="mt-2 text-xs text-muted-foreground font-mono">
        All contributions for tasks in this feature (public). Admins can review
        here.
      </p>

      {contributions.length === 0 ? (
        <div className="mt-3 text-center py-4 relative">
          <div className="text-3xl text-muted-foreground/30 font-mono mb-2">
            [ ]
          </div>
          <p className="text-sm text-muted-foreground font-mono">
            <span>{">"}</span> NO_SUBMISSIONS_YET
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-2 relative">
          {contributions
            .slice()
            .sort((a, b) => (a.submission_date < b.submission_date ? 1 : -1))
            .map((c) => {
              const taskName = taskById.get(c.task_id)?.name ?? c.task_id;
              const statusIcon =
                c.status === "APPROVED" ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : c.status === "CHANGES_REQUESTED" ? (
                  <AlertCircle className="w-3 h-3" />
                ) : c.status === "REJECTED" ? (
                  <XCircle className="w-3 h-3" />
                ) : null;
              const statusVariant =
                c.status === "APPROVED"
                  ? ("default" as const)
                  : c.status === "CHANGES_REQUESTED"
                    ? ("destructive" as const)
                    : c.status === "REJECTED"
                      ? ("destructive" as const)
                      : ("outline" as const);
              return (
                <div
                  key={c.id}
                  className="rounded-md border border-border/60 bg-card hover:bg-card/80 hover:border-primary/30 transition-all px-3 py-2 group"
                >
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={statusVariant} className="gap-1">
                        {statusIcon}
                        {c.status}
                      </Badge>
                      {typeof c.cp_awarded === "number" ? (
                        <Badge variant="secondary">{c.cp_awarded} CP</Badge>
                      ) : null}
                      <Badge variant="outline">{taskName}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {contributorsById[c.contributor_id]?.username ??
                        `${c.contributor_id.slice(0, 6)}…${c.contributor_id.slice(-4)}`}{" "}
                      · {formatTime(c.submission_date)}
                    </div>
                  </div>

                  <div className="mt-2 text-sm font-mono">
                    <a
                      href={c.submitted_work_url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-primary inline-flex items-center gap-1 group/link"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {c.submitted_work_url}
                    </a>
                  </div>

                  {c.submission_notes ? (
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground font-mono">
                      {c.submission_notes}
                    </pre>
                  ) : null}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button variant="outline" asChild>
                      <Link href={`/contribute/${c.task_id}`}>Open task</Link>
                    </Button>
                  </div>

                  {isAdmin ? (
                    <div className="mt-3 rounded-md border border-border/60 bg-background p-3">
                      <h3 className="text-xs font-mono font-semibold uppercase tracking-wider">
                        <span>{">"}</span> ADMIN: REVIEW
                      </h3>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                            CP (for APPROVED)
                          </label>
                          <Input
                            value={reviewCp[c.id] ?? ""}
                            onChange={(e) =>
                              setReviewCp((prev) => ({
                                ...prev,
                                [c.id]: e.target.value,
                              }))
                            }
                            placeholder="e.g. 50"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                            Notes
                          </label>
                          <Input
                            value={reviewNotes[c.id] ?? ""}
                            onChange={(e) =>
                              setReviewNotes((prev) => ({
                                ...prev,
                                [c.id]: e.target.value,
                              }))
                            }
                            placeholder="Feedback / approval notes"
                          />
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          disabled={loading || !address}
                          onClick={() =>
                            handleApprove(
                              c.id,
                              "CHANGES_REQUESTED",
                              null,
                              (reviewNotes[c.id] ?? "").trim() || null,
                            )
                          }
                        >
                          Request changes
                        </Button>
                        <Button
                          variant="outline"
                          disabled={loading || !address}
                          onClick={() =>
                            handleApprove(
                              c.id,
                              "REJECTED",
                              null,
                              (reviewNotes[c.id] ?? "").trim() || null,
                            )
                          }
                        >
                          Reject
                        </Button>
                        <Button
                          disabled={loading || !address}
                          onClick={() => {
                            const cpText = (reviewCp[c.id] ?? "").trim();
                            if (!cpText) {
                              onError("CP is required to approve");
                              return;
                            }
                            const cpValue = Number(cpText);
                            if (!Number.isFinite(cpValue) || cpValue < 0) {
                              onError("CP must be a non-negative number");
                              return;
                            }
                            handleApprove(
                              c.id,
                              "APPROVED",
                              cpValue,
                              (reviewNotes[c.id] ?? "").trim() || null,
                            );
                          }}
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
        </div>
      )}
    </Card>
  );
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}
