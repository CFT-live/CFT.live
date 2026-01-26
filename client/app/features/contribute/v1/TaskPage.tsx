"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, useRouter } from "@/i18n/routing";

import {
  deleteTask,
  getTask,
  patchTask,
  claimTask,
  listContributions,
  approveContribution,
  submitContribution,
} from "@/app/features/contribute/v1/api/api";
import type { Contribution, Task, TaskStatus, TaskType } from "@/app/features/contribute/v1/api/types";
import { useContributorProfile } from "./hooks/useContributorProfile";

const STATUS_OPTIONS = [
  "OPEN",
  "CLAIMED",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "DONE",
];

const TYPE_OPTIONS = [
  "GENERAL",
  "TECH",
  "DESIGN",
  "MARKETING",
  "BUSINESS",
  "DOCS",
] as const;

function formatIsoTime(iso: string | null | undefined): string {
  try {
    if (!iso) return "-";
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function TaskPage({ taskId }: { taskId: string }) {
  const { address } = useAppKitAccount();
  const router = useRouter();
  const { isAdmin, hasProfile, contributor, isLoading: profileLoading, ensureProfile } = useContributorProfile(address);
  
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [contribLoading, setContribLoading] = useState(false);
  const [contribError, setContribError] = useState<string | null>(null);

  const [reviewCp, setReviewCp] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState<TaskType>("TECH");
  const [editStatus, setEditStatus] = useState<TaskStatus>("OPEN");
  const [editAcceptanceCriteria, setEditAcceptanceCriteria] = useState("");

  const [submitUrl, setSubmitUrl] = useState("");
  const [submitNotes, setSubmitNotes] = useState("");
  const [submitPrNumber, setSubmitPrNumber] = useState<string>("");

  const canSubmit = useMemo(() => {
    if (!submitUrl.trim()) return false;
    if (!address) return false;
    if (!task) return false;
    const me = address.toLowerCase();
    // v1 flow: you must claim the task before submitting work.
    return task.claimed_by_id === me && (task.status === "CLAIMED" || task.status === "CHANGES_REQUESTED");
  }, [address, submitUrl, task]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await getTask(taskId);
      setTask(res.task);

      setEditName(res.task.name);
      setEditDescription(res.task.description);
      setEditAcceptanceCriteria(res.task.acceptance_criteria);
      setEditType(res.task.task_type);
      setEditStatus(res.task.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function refreshContributions(taskToUse?: Task | null) {
    const t = taskToUse ?? task;
    if (!t) return;

    setContribLoading(true);
    setContribError(null);
    try {
      const res = await listContributions({ task_id: t.id });
      setContributions(res.contributions);
    } catch (e) {
      setContribError(e instanceof Error ? e.message : String(e));
    } finally {
      setContribLoading(false);
    }
  }

  useEffect(() => {
    void refresh().then(() => void refreshContributions());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  // Handle profile check for authenticated actions
  async function handleAuthenticatedAction(): Promise<boolean> {
    if (!address) {
      setError("Please connect your wallet first");
      return false;
    }

    const canProceed = await ensureProfile();
    if (!canProceed) {
      if (hasProfile === false) {
          setError("Please create a contributor profile first at /contribute/profile");
      }
    }
    return canProceed;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Link
              href="/contribute/features"
              className="text-sm font-mono text-muted-foreground hover:text-primary"
              style={{ textDecoration: "none" }}
            >
              ← Features
            </Link>
          </div>
          <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-wider">
            {task?.name ?? "Task"}
          </h1>
          {task ? (
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{task.status}</Badge>
              <Badge variant="secondary">{task.task_type}</Badge>
            </div>
          ) : null}
          {task ? (
            <p className="text-xs text-muted-foreground font-mono">
              Created {formatIsoTime(task.created_date)}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {address && hasProfile === null ? (
            <Button 
              variant="outline" 
              onClick={() => void ensureProfile()}
              disabled={profileLoading}
            >
              {profileLoading ? "Connecting…" : "Connect profile"}
            </Button>
          ) : address && hasProfile === true && contributor ? (
            <Button variant="outline" disabled>
              Profile: {contributor.username}
            </Button>
          ) : null}
          {isAdmin ? (
            <>
              <Button
                variant="destructive"
                disabled={!task || loading || deleting}
                onClick={async () => {
                  if (!task) return;
                  const ok = window.confirm(
                    `Delete this task? This cannot be undone.\n\n${task.name}`
                  );
                  if (!ok) return;

                  setError(null);
                  const canProceed = await handleAuthenticatedAction();
                  if (!canProceed) return;
                  
                  setDeleting(true);
                  try {
                    await deleteTask(taskId);
                    router.push("/contribute/features" as never);
                    router.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
              <Button variant="outline" onClick={() => setEditOpen((v) => !v)}>
                {editOpen ? "Close edit" : "Edit"}
              </Button>
            </>
          ) : null}
          <Button
            variant="outline"
            onClick={() => void refresh()}
            disabled={loading || deleting}
          >
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!task ? (
        <Card className="p-4 border border-border/60 bg-background/60">
          <p className="text-sm text-muted-foreground">Loading task…</p>
        </Card>
      ) : null}

      {task ? (
        <Card className="p-4 border border-border/60 bg-background/60">
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider">
            Description
          </h2>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-foreground/90 font-mono leading-relaxed">
            {task.description || "(no description)"}
          </pre>
          <h2 className="mt-4 text-sm font-mono font-semibold uppercase tracking-wider">
            Acceptance criteria
          </h2>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-foreground/90 font-mono leading-relaxed">
            {task.acceptance_criteria || "(none)"}
          </pre>
        </Card>
      ) : null}

      {task ? (
        <Card className="p-4 border border-border/60 bg-background/60">
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider">
            Claim
          </h2>
          <p className="mt-2 text-xs text-muted-foreground font-mono">
            Only one contributor can claim a task at a time.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              disabled={!task || loading || task.status !== "OPEN" || !address}
              onClick={async () => {
                setError(null);
                const canProceed = await handleAuthenticatedAction();
                if (!canProceed) return;

                try {
                  await claimTask({ task_id: task.id, action: "CLAIM" });
                  await refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              Claim task
            </Button>

            <Button
              variant="outline"
              disabled={
                !task ||
                loading ||
                task.status !== "CLAIMED" ||
                !address ||
                task.claimed_by_id !== address.toLowerCase()
              }
              onClick={async () => {
                setError(null);
                const canProceed = await handleAuthenticatedAction();
                if (!canProceed) return;
                try {
                  await claimTask({ task_id: task.id, action: "UNCLAIM" });
                  await refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              Unclaim
            </Button>

            <span className="text-xs text-muted-foreground font-mono">
              {task.claimed_by_id
                ? `Claimed by ${task.claimed_by_id.slice(0, 6)}…${task.claimed_by_id.slice(-4)}`
                : "Unclaimed"}
            </span>
          </div>
        </Card>
      ) : null}

      {editOpen && task && isAdmin ? (
        <Card className="p-4 border border-border/60 bg-background/60">
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider">
            Edit task
          </h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Name
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Type
              </label>
              <Select
                value={editType}
                onValueChange={(v) => setEditType(v as TaskType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Status
              </label>
              <Select
                value={editStatus}
                onValueChange={(v) => setEditStatus(v as TaskStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full min-h-[140px] rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Acceptance criteria
              </label>
              <textarea
                value={editAcceptanceCriteria}
                onChange={(e) => setEditAcceptanceCriteria(e.target.value)}
                className="w-full min-h-[140px] rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              onClick={async () => {
                setError(null);
                const canProceed = await handleAuthenticatedAction();
                if (!canProceed) return;
                
                try {
                  await patchTask(taskId, {
                    feature_id: task.feature_id,
                    name: editName,
                    description: editDescription,
                    task_type: editType,
                    acceptance_criteria: editAcceptanceCriteria,
                    status: editStatus,
                  });
                  await refresh();
                  setEditOpen(false);
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              Save
            </Button>
          </div>
        </Card>
      ) : null}

      {task ? (
        <Card className="p-4 border border-border/60 bg-background/60">
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider">
            Submit work
          </h2>
          <p className="mt-2 text-xs text-muted-foreground font-mono">
            Submit a link to your work (PR, docs, demo). Requires a contributor profile.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Work URL
              </label>
              <Input
                value={submitUrl}
                onChange={(e) => setSubmitUrl(e.target.value)}
                placeholder="https://github.com/.../pull/123"
              />
            </div>

            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                GitHub PR number (optional)
              </label>
              <Input
                value={submitPrNumber}
                onChange={(e) => setSubmitPrNumber(e.target.value)}
                placeholder="123"
              />
            </div>

            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Notes (optional)
              </label>
              <textarea
                value={submitNotes}
                onChange={(e) => setSubmitNotes(e.target.value)}
                className="w-full min-h-[110px] rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                placeholder="What did you do? Anything reviewers should know?"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                disabled={!canSubmit || loading}
                onClick={async () => {
                  setError(null);
                  const canProceed = await handleAuthenticatedAction();
                  if (!canProceed) return;

                  if (!task) {
                    setError("Task not loaded");
                    return;
                  }

                  const me = address?.toLowerCase();
                  if (!me) {
                    setError("Missing wallet address");
                    return;
                  }

                  if (task.claimed_by_id !== me || (task.status !== "CLAIMED" && task.status !== "CHANGES_REQUESTED")) {
                    setError("You must claim this task before submitting");
                    return;
                  }

                  const prNum = submitPrNumber.trim();
                  const parsedPrNumber = prNum ? Number(prNum) : null;
                  if (prNum) {
                    const n = Number(prNum);
                    if (!Number.isFinite(n) || n <= 0) {
                      setError("PR number must be a positive integer");
                      return;
                    }
                  }
                  if (prNum && !Number.isInteger(Number(prNum))) {
                    setError("PR number must be a positive integer");
                    return;
                  }

                  try {
                    await submitContribution({
                      task_id: task.id,
                      submitted_work_url: submitUrl.trim(),
                      submission_notes: submitNotes.trim() ? submitNotes.trim() : null,
                      github_pr_number: parsedPrNumber,
                    });
                    setSubmitUrl("");
                    setSubmitNotes("");
                    setSubmitPrNumber("");
                    await refresh();
                    await refreshContributions(task);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  }
                }}
              >
                Submit
              </Button>

              {!address ? (
                <span className="text-xs text-muted-foreground font-mono">
                  Connect wallet to submit
                </span>
              ) : task && task.claimed_by_id !== address.toLowerCase() ? (
                <span className="text-xs text-muted-foreground font-mono">
                  Claim this task first to submit
                </span>
              ) : task && task.status !== "CLAIMED" && task.status !== "CHANGES_REQUESTED" ? (
                <span className="text-xs text-muted-foreground font-mono">
                  Submissions are only allowed when CLAIMED or CHANGES_REQUESTED
                </span>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      {task ? (
        <Card className="p-4 border border-border/60 bg-background/60">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-mono font-semibold uppercase tracking-wider">
              Contributions
            </h2>
            <Button
              variant="outline"
              onClick={() => void refreshContributions(task)}
              disabled={contribLoading}
            >
              {contribLoading ? "Loading…" : "Refresh"}
            </Button>
          </div>

          {contribError ? (
            <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {contribError}
            </div>
          ) : null}

          {contributions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {contributions
                .slice()
                .sort((a, b) => (a.submission_date < b.submission_date ? 1 : -1))
                .map((c) => (
                  <div
                    key={c.id}
                    className="rounded-md border border-border/60 bg-background px-3 py-2"
                  >
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{c.status}</Badge>
                        {typeof c.cp_awarded === "number" ? (
                          <Badge variant="secondary">{c.cp_awarded} CP</Badge>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {c.contributor_id.slice(0, 6)}…{c.contributor_id.slice(-4)} · {formatIsoTime(c.submission_date)}
                      </div>
                    </div>

                    <div className="mt-2 text-sm font-mono">
                      <a
                        href={c.submitted_work_url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-primary"
                      >
                        {c.submitted_work_url}
                      </a>
                    </div>
                    {c.submission_notes ? (
                      <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground font-mono">
                        {c.submission_notes}
                      </pre>
                    ) : null}

                    {c.approver_id ? (
                      <div className="mt-2 text-xs text-muted-foreground font-mono">
                        Approved by {c.approver_id.slice(0, 6)}…{c.approver_id.slice(-4)}
                        {c.approval_date ? ` · ${formatIsoTime(c.approval_date)}` : ""}
                      </div>
                    ) : null}
                    {c.approval_notes ? (
                      <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground font-mono">
                        {c.approval_notes}
                      </pre>
                    ) : null}

                    {isAdmin ? (
                      <div className="mt-3 rounded-md border border-border/60 bg-background p-3">
                        <div className="text-xs font-mono font-semibold uppercase tracking-wider">
                          Review (Admin)
                        </div>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                              CP (for APPROVED)
                            </label>
                            <Input
                              value={reviewCp[c.id] ?? ""}
                              onChange={(e) =>
                                setReviewCp((prev) => ({ ...prev, [c.id]: e.target.value }))
                              }
                              placeholder="e.g. 50"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                              Status
                            </label>
                            <Input
                              value={c.status}
                              readOnly
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                              Notes
                            </label>
                            <textarea
                              value={reviewNotes[c.id] ?? ""}
                              onChange={(e) =>
                                setReviewNotes((prev) => ({ ...prev, [c.id]: e.target.value }))
                              }
                              className="w-full min-h-[90px] rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                              placeholder="Feedback / approval notes"
                            />
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            disabled={loading}
                            onClick={async () => {
                              setError(null);
                              const canProceed = await handleAuthenticatedAction();
                              if (!canProceed) return;
                              try {
                                await approveContribution({
                                  contribution_id: c.id,
                                  status: "CHANGES_REQUESTED",
                                  cp_awarded: null,
                                  approval_notes: (reviewNotes[c.id] ?? "").trim() || null,
                                });
                                await refreshContributions(task);
                              } catch (e) {
                                setError(e instanceof Error ? e.message : String(e));
                              }
                            }}
                          >
                            Request changes
                          </Button>
                          <Button
                            variant="outline"
                            disabled={loading}
                            onClick={async () => {
                              setError(null);
                              const canProceed = await handleAuthenticatedAction();
                              if (!canProceed) return;

                              try {
                                await approveContribution({
                                  contribution_id: c.id,
                                  status: "REJECTED",
                                  cp_awarded: null,
                                  approval_notes: (reviewNotes[c.id] ?? "").trim() || null,
                                });
                                await refreshContributions(task);
                              } catch (e) {
                                setError(e instanceof Error ? e.message : String(e));
                              }
                            }}
                          >
                            Reject
                          </Button>
                          <Button
                            disabled={loading}
                            onClick={async () => {
                              setError(null);
                              const canProceed = await handleAuthenticatedAction();
                              if (!canProceed) return;

                              const cpText = (reviewCp[c.id] ?? "").trim();
                              if (!cpText) {
                                setError("CP is required to approve");
                                return;
                              }
                              const cpValue = Number(cpText);
                              if (!Number.isFinite(cpValue) || cpValue < 0) {
                                setError("CP must be a non-negative number");
                                return;
                              }

                              try {
                                await approveContribution({
                                  contribution_id: c.id,
                                  status: "APPROVED",
                                  cp_awarded: cpValue,
                                  approval_notes: (reviewNotes[c.id] ?? "").trim() || null,
                                });
                                await refreshContributions(task);
                              } catch (e) {
                                setError(e instanceof Error ? e.message : String(e));
                              }
                            }}
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
