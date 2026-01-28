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
} from "@/app/features/contribute/v1/api/api";
import type {
  Task,
  TaskStatus,
  TaskType,
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
  const [editingAcceptanceCriteria, setEditingAcceptanceCriteria] = useState(false);
  const [editAcceptanceCriteria, setEditAcceptanceCriteria] = useState("");
  const [savingField, setSavingField] = useState(false);

  const [submitUrl, setSubmitUrl] = useState("");
  const [submitNotes, setSubmitNotes] = useState("");
  const [submitPrNumber, setSubmitPrNumber] = useState<string>("");

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
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const canSubmit = useMemo(() => {
    if (!submitUrl.trim()) return false;
    if (!address) return false;
    if (!task) return false;
    const me = address.toLowerCase();
    // v1 flow: you must claim the task before submitting work.
    return (
      task.claimed_by_id === me &&
      (task.status === "CLAIMED" || task.status === "CHANGES_REQUESTED")
    );
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
      }
    }
    return canProceed;
  }

  return (
    <div className="space-y-6 relative">
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
            isAdmin={isAdmin}
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
            isAdmin={isAdmin}
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
            isAdmin={isAdmin}
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
            isAdmin={isAdmin}
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
            isAdmin={isAdmin}
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
            <span className="text-primary">{">"}[</span> Submit work{" "}
            <span className="text-primary">]</span>
          </h2>
          <p className="mt-2 text-xs text-muted-foreground font-mono">
            Submit a link to your work (PR, docs, demo). Requires a contributor
            profile.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs font-mono text-muted-foreground">
                Work URL
              </label>
              <Input
                value={submitUrl}
                onChange={(e) => setSubmitUrl(e.target.value)}
                placeholder="https://github.com/.../pull/123"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground">
                GitHub PR number (optional)
              </label>
              <Input
                value={submitPrNumber}
                onChange={(e) => setSubmitPrNumber(e.target.value)}
                placeholder="123"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground">
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

                  if (
                    task.claimed_by_id !== me ||
                    (task.status !== "CLAIMED" &&
                      task.status !== "CHANGES_REQUESTED")
                  ) {
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
                      submission_notes: submitNotes.trim()
                        ? submitNotes.trim()
                        : null,
                      github_pr_number: parsedPrNumber,
                    });
                    setSubmitUrl("");
                    setSubmitNotes("");
                    setSubmitPrNumber("");
                    await refresh();
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
              ) : task &&
                task.status !== "CLAIMED" &&
                task.status !== "CHANGES_REQUESTED" ? (
                <span className="text-xs text-muted-foreground font-mono">
                  Submissions are only allowed when CLAIMED or CHANGES_REQUESTED
                </span>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
