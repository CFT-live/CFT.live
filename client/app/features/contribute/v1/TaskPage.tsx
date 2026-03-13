"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  User,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/routing";

import {
  deleteTask,
  getTask,
  patchTask,
  submitContribution,
  claimTask,
  listContributions,
  approveContribution,
} from "@/app/features/contribute/v1/api/api";
import type {
  Task,
  TaskStatus,
  TaskType,
  Contribution,
} from "@/app/features/contribute/v1/api/types";
import { useContributorProfile } from "./hooks/useContributorProfile";
import { EditableTextField, EditableOptionsField } from "./EditableField";

const STATUS_OPTIONS = [
  "OPEN",
  "CLAIMED",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "DONE",
] as const;

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
  const {
    isAdmin,
    hasProfile,
    contributor,
    isLoading: profileLoading,
    ensureProfile,
  } = useContributorProfile(address);

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editingType, setEditingType] = useState(false);
  const [editType, setEditType] = useState<TaskType>("TECH");
  const [editingStatus, setEditingStatus] = useState(false);
  const [editStatus, setEditStatus] = useState<TaskStatus>("OPEN");
  const [editingAcceptanceCriteria, setEditingAcceptanceCriteria] =
    useState(false);
  const [editAcceptanceCriteria, setEditAcceptanceCriteria] = useState("");
  const [savingField, setSavingField] = useState(false);

  const [submitUrl, setSubmitUrl] = useState("");
  const [submitNotes, setSubmitNotes] = useState("");
  const [submitPrNumber, setSubmitPrNumber] = useState<string>("");

  const [claiming, setClaiming] = useState(false);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [contributionsLoading, setContributionsLoading] = useState(false);
  const [claimerUsername, setClaimerUsername] = useState<string | null>(null);
  const [submittingWork, setSubmittingWork] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [reviewCp, setReviewCp] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
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

      // Fetch claimer username if task is claimed
      if (res.task.claimed_by_id) {
        try {
          const claimerRes = await fetch("/api/public/contributors/get", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: res.task.claimed_by_id }),
          });
          if (claimerRes.ok) {
            const claimerData = (await claimerRes.json()) as {
              contributor: { username: string };
            };
            setClaimerUsername(claimerData.contributor.username);
          }
        } catch {
          // Fail silently, will show address instead
        }
      } else {
        setClaimerUsername(null);
      }

      // Load contributions
      await refreshContributions();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const refreshContributions = useCallback(async () => {
    setContributionsLoading(true);
    try {
      const res = await listContributions({ task_id: taskId });
      setContributions(res.contributions);
    } catch (e) {
      console.error("Failed to load contributions:", e);
    } finally {
      setContributionsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const canSubmit = useMemo(() => {
    if (!submitUrl.trim()) return false;
    if (!address) return false;
    if (!task) return false;
    return true;
  }, [address, submitUrl, task]);

  // Handle profile check for authenticated actions
  async function handleAuthenticatedAction(): Promise<boolean> {
    if (!address) {
      setError("Please connect your wallet first");
      return false;
    }

    const canProceed = await ensureProfile();
    if (!canProceed) {
      if (hasProfile === false) {
        setError(
          "Please create a contributor profile first at /contribute/profile",
        );
      } else {
        setError("Please authenticate your wallet to continue");
      }
    }
    return canProceed;
  }

  return (
    <div className="space-y-6 relative">
      {/* Error Alert */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-mono font-semibold text-destructive mb-1">
                Error
              </h3>
              <p className="text-sm font-mono text-destructive/90">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-destructive/70 hover:text-destructive transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="rounded-md border border-primary/50 bg-primary/10 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-mono text-primary">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-primary/70 hover:text-primary transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-wider">
            <span className="text-muted-foreground">{">"}</span>{" "}
            {task?.name ?? "Task"}
          </h1>
          {task ? (
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={
                  task.status === "DONE"
                    ? "default"
                    : task.status === "IN_REVIEW"
                      ? "secondary"
                      : task.status === "CHANGES_REQUESTED"
                        ? "destructive"
                        : "outline"
                }
                className="gap-1"
              >
                {task.status === "DONE" ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : task.status === "IN_REVIEW" ? (
                  <Clock className="w-3 h-3" />
                ) : task.status === "CHANGES_REQUESTED" ? (
                  <AlertCircle className="w-3 h-3" />
                ) : null}
                {task.status}
              </Badge>
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
                    `Delete this task? This cannot be undone.\n\n${task.name}`,
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
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </Button>
            </>
          ) : null}
          <Button
            variant="outline"
            onClick={() => void refresh()}
            disabled={loading || deleting}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!task ? (
        <Card className="p-4 border border-border/60 bg-card/60 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground relative">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading task…
          </div>
        </Card>
      ) : null}

      {task ? (
        <Card className="p-4 border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/20 transition-all relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />

          {/* Name Field */}
          <EditableTextField
            title="Name"
            value={editName}
            isEditable={isAdmin}
            isEditing={editingName}
            isSaving={savingField}
            onEdit={() => {
              setEditName(task.name);
              setEditingName(true);
            }}
            onCancel={() => setEditingName(false)}
            onChange={setEditName}
            onSave={async () => {
              setError(null);
              setSuccessMessage(null);
              const canProceed = await handleAuthenticatedAction();
              if (!canProceed) return;

              setSavingField(true);
              try {
                await patchTask(taskId, {
                  feature_id: task.feature_id,
                  name: editName,
                  description: task.description,
                  task_type: task.task_type,
                  acceptance_criteria: task.acceptance_criteria,
                  status: task.status,
                });
                await refresh();
                setEditingName(false);
                setSuccessMessage("Task name updated successfully!");
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              } finally {
                setSavingField(false);
              }
            }}
          />

          {/* Type Field */}
          <EditableOptionsField
            title="Type"
            value={editType}
            options={TYPE_OPTIONS}
            isEditable={isAdmin}
            isEditing={editingType}
            isSaving={savingField}
            onEdit={() => {
              setEditType(task.task_type);
              setEditingType(true);
            }}
            onCancel={() => setEditingType(false)}
            onChange={setEditType}
            onSave={async () => {
              setError(null);
              setSuccessMessage(null);
              const canProceed = await handleAuthenticatedAction();
              if (!canProceed) return;

              setSavingField(true);
              try {
                await patchTask(taskId, {
                  feature_id: task.feature_id,
                  name: task.name,
                  description: task.description,
                  task_type: editType,
                  acceptance_criteria: task.acceptance_criteria,
                  status: task.status,
                });
                await refresh();
                setEditingType(false);
                setSuccessMessage("Task type updated successfully!");
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              } finally {
                setSavingField(false);
              }
            }}
            renderDisplay={() => (
              <Badge variant="secondary" className="mt-2">
                {task.task_type}
              </Badge>
            )}
          />

          {/* Status Field */}
          <EditableOptionsField
            title="Status"
            value={editStatus}
            options={STATUS_OPTIONS}
            isEditable={isAdmin}
            isEditing={editingStatus}
            isSaving={savingField}
            onEdit={() => {
              setEditStatus(task.status);
              setEditingStatus(true);
            }}
            onCancel={() => setEditingStatus(false)}
            onChange={setEditStatus}
            onSave={async () => {
              setError(null);
              setSuccessMessage(null);
              const canProceed = await handleAuthenticatedAction();
              if (!canProceed) return;

              setSavingField(true);
              try {
                await patchTask(taskId, {
                  feature_id: task.feature_id,
                  name: task.name,
                  description: task.description,
                  task_type: task.task_type,
                  acceptance_criteria: task.acceptance_criteria,
                  status: editStatus,
                });
                await refresh();
                setEditingStatus(false);
                setSuccessMessage("Task status updated successfully!");
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              } finally {
                setSavingField(false);
              }
            }}
            renderDisplay={() => (
              <Badge
                variant={
                  task.status === "DONE"
                    ? "default"
                    : task.status === "IN_REVIEW"
                      ? "secondary"
                      : task.status === "CHANGES_REQUESTED"
                        ? "destructive"
                        : "outline"
                }
                className="gap-1 mt-2"
              >
                {task.status === "DONE" ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : task.status === "IN_REVIEW" ? (
                  <Clock className="w-3 h-3" />
                ) : task.status === "CHANGES_REQUESTED" ? (
                  <AlertCircle className="w-3 h-3" />
                ) : null}
                {task.status}
              </Badge>
            )}
          />

          {/* Description Field */}
          <EditableTextField
            title="Description"
            value={editDescription}
            isEditable={isAdmin}
            isEditing={editingDescription}
            isSaving={savingField}
            multiline
            onEdit={() => {
              setEditDescription(task.description);
              setEditingDescription(true);
            }}
            onCancel={() => setEditingDescription(false)}
            onChange={setEditDescription}
            onSave={async () => {
              setError(null);
              setSuccessMessage(null);
              const canProceed = await handleAuthenticatedAction();
              if (!canProceed) return;

              setSavingField(true);
              try {
                await patchTask(taskId, {
                  feature_id: task.feature_id,
                  name: task.name,
                  description: editDescription,
                  task_type: task.task_type,
                  acceptance_criteria: task.acceptance_criteria,
                  status: task.status,
                });
                await refresh();
                setEditingDescription(false);
                setSuccessMessage("Task description updated successfully!");
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              } finally {
                setSavingField(false);
              }
            }}
            placeholder="What did you do? Anything reviewers should know?"
          />

          {/* Acceptance Criteria Field */}
          <EditableTextField
            title="Acceptance criteria"
            value={editAcceptanceCriteria}
            isEditable={isAdmin}
            isEditing={editingAcceptanceCriteria}
            isSaving={savingField}
            multiline
            onEdit={() => {
              setEditAcceptanceCriteria(task.acceptance_criteria);
              setEditingAcceptanceCriteria(true);
            }}
            onCancel={() => setEditingAcceptanceCriteria(false)}
            onChange={setEditAcceptanceCriteria}
            onSave={async () => {
              setError(null);
              setSuccessMessage(null);
              const canProceed = await handleAuthenticatedAction();
              if (!canProceed) return;

              setSavingField(true);
              try {
                await patchTask(taskId, {
                  feature_id: task.feature_id,
                  name: task.name,
                  description: task.description,
                  task_type: task.task_type,
                  acceptance_criteria: editAcceptanceCriteria,
                  status: task.status,
                });
                await refresh();
                setEditingAcceptanceCriteria(false);
                setSuccessMessage("Acceptance criteria updated successfully!");
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              } finally {
                setSavingField(false);
              }
            }}
            className=""
          />
        </Card>
      ) : null}

      {task ? (
        <Card className="p-4 border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/20 transition-all relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider relative">
            <span>{">"}</span> Submit work
          </h2>
          <p className="mt-2 text-xs text-muted-foreground font-mono">
            Submit a link to your work (PR, docs, demo). Requires a contributor
            profile.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <div>
              <label
                htmlFor="work-url"
                className="text-xs font-mono text-muted-foreground"
              >
                Work URL
              </label>
              <Input
                id="work-url"
                name="workUrl"
                value={submitUrl}
                onChange={(e) => setSubmitUrl(e.target.value)}
                placeholder="https://github.com/.../pull/123"
                disabled={submittingWork}
              />
            </div>

            <div>
              <label
                htmlFor="pr-number"
                className="text-xs font-mono text-muted-foreground"
              >
                GitHub PR number (optional)
              </label>
              <Input
                id="pr-number"
                name="prNumber"
                value={submitPrNumber}
                onChange={(e) => setSubmitPrNumber(e.target.value)}
                placeholder="123"
                disabled={submittingWork}
              />
            </div>

            <div>
              <label
                htmlFor="submission-notes"
                className="text-xs font-mono text-muted-foreground"
              >
                Notes (optional)
              </label>
              <textarea
                id="submission-notes"
                name="submissionNotes"
                value={submitNotes}
                onChange={(e) => setSubmitNotes(e.target.value)}
                className="w-full min-h-[110px] rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                placeholder="What did you do? Anything reviewers should know?"
                disabled={submittingWork}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                disabled={!canSubmit || loading || submittingWork}
                onClick={async () => {
                  setError(null);
                  setSuccessMessage(null);
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

                  setSubmittingWork(true);
                  try {
                    await submitContribution({
                      task_id: task.id,
                      submitted_work_url: submitUrl.trim(),
                      submission_notes: submitNotes.trim()
                        ? submitNotes.trim()
                        : null,
                      github_pr_number: parsedPrNumber,
                    });
                    setSubmitUrl("");
                    setSubmitNotes("");
                    setSubmitPrNumber("");
                    setSuccessMessage("Work submitted successfully!");
                    await refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setSubmittingWork(false);
                  }
                }}
              >
                {submittingWork ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>

              {!address && (
                <span className="text-xs text-muted-foreground font-mono">
                  Connect wallet to submit
                </span>
              )}
            </div>
          </div>
        </Card>
      ) : null}

      {task ? (
        <Card className="p-4 border border-border/60 bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />
          <div className="flex items-center justify-between gap-2 relative">
            <h2 className="text-sm font-mono font-semibold uppercase tracking-wider">
              <span>{">"}</span> Submissions for this task
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void refreshContributions()}
              disabled={contributionsLoading}
            >
              {contributionsLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground font-mono">
            All work submissions for this task.{" "}
            {isAdmin ? "Admins can review here." : ""}
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
                .sort((a, b) =>
                  a.submission_date < b.submission_date ? 1 : -1,
                )
                .map((c) => {
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
                      className="rounded-md border border-border/60 bg-card hover:bg-card/80 hover:border-primary/30 transition-all px-3 py-2"
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
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {`${c.contributor_id.slice(0, 6)}…${c.contributor_id.slice(-4)}`}{" "}
                          · {formatIsoTime(c.submission_date)}
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

                      {c.approval_notes ? (
                        <div className="mt-2 rounded-md border border-border/60 bg-background/50 p-2">
                          <p className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                            Review notes
                          </p>
                          <pre className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground font-mono">
                            {c.approval_notes}
                          </pre>
                        </div>
                      ) : null}

                      {isAdmin && c.status !== "APPROVED" ? (
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
                              onClick={async () => {
                                setError(null);
                                setSuccessMessage(null);
                                if (!address) {
                                  setError("Connect wallet to review");
                                  return;
                                }
                                try {
                                  await approveContribution({
                                    contribution_id: c.id,
                                    status: "CHANGES_REQUESTED",
                                    cp_awarded: null,
                                    approval_notes:
                                      (reviewNotes[c.id] ?? "").trim() || null,
                                  });
                                  await refresh();
                                  setSuccessMessage(
                                    "Changes requested successfully!",
                                  );
                                } catch (e) {
                                  setError(
                                    e instanceof Error ? e.message : String(e),
                                  );
                                }
                              }}
                            >
                              Request changes
                            </Button>
                            <Button
                              variant="outline"
                              disabled={loading || !address}
                              onClick={async () => {
                                setError(null);
                                setSuccessMessage(null);
                                if (!address) {
                                  setError("Connect wallet to review");
                                  return;
                                }
                                try {
                                  await approveContribution({
                                    contribution_id: c.id,
                                    status: "REJECTED",
                                    cp_awarded: null,
                                    approval_notes:
                                      (reviewNotes[c.id] ?? "").trim() || null,
                                  });
                                  await refresh();
                                  setSuccessMessage("Contribution rejected!");
                                } catch (e) {
                                  setError(
                                    e instanceof Error ? e.message : String(e),
                                  );
                                }
                              }}
                            >
                              Reject
                            </Button>
                            <Button
                              disabled={loading || !address}
                              onClick={async () => {
                                setError(null);
                                setSuccessMessage(null);
                                if (!address) {
                                  setError("Connect wallet to review");
                                  return;
                                }

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
                                    approval_notes:
                                      (reviewNotes[c.id] ?? "").trim() || null,
                                  });
                                  await refresh();
                                  setSuccessMessage(
                                    `Contribution approved with ${cpValue} CP!`,
                                  );
                                } catch (e) {
                                  setError(
                                    e instanceof Error ? e.message : String(e),
                                  );
                                }
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
      ) : null}
    </div>
  );
}
