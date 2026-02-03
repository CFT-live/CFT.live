"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  Loader2,
  RefreshCw,
  Plus,
  XCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { Tooltip } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

import { EditableTextField, EditableOptionsField } from "./EditableField";
import { TaskCard } from "./TaskCard";

import {
  approveContribution,
  createTask,
  listContributions,
  listTasks,
  getFeature,
  updateFeature,
  deleteFeature,
} from "./api/api";
import type { Contribution, Feature, Task } from "./api/types";
import { useContributorProfile } from "./hooks/useContributorProfile";

type PublicContributor = {
  id: string;
  wallet_address: string;
  username: string;
  github_username: string | null;
  telegram_handle: string | null;
  roles: string[];
  status: string;
};

export default function FeaturePage({ featureId }: { featureId: string }) {
  const { address } = useAppKitAccount();
  const { isAdmin } = useContributorProfile(address);

  const [feature, setFeature] = useState<Feature | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [contributorsById, setContributorsById] = useState<
    Record<string, PublicContributor>
  >({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contributionsLoaded, setContributionsLoaded] = useState(false);

  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTaskName, setCreateTaskName] = useState("");
  const [createTaskDescription, setCreateTaskDescription] = useState("");
  const [createTaskAcceptance, setCreateTaskAcceptance] = useState("");
  const [createTaskType, setCreateTaskType] =
    useState<Task["task_type"]>("TECH");
  const [creatingTask, setCreatingTask] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [reviewCp, setReviewCp] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  // Feature field editing state
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editingCategory, setEditingCategory] = useState(false);
  const [editCategory, setEditCategory] = useState("");
  const [editingStatus, setEditingStatus] = useState(false);
  const [editStatus, setEditStatus] = useState<Feature["status"]>("OPEN");
  const [editingTokens, setEditingTokens] = useState(false);
  const [editTokens, setEditTokens] = useState("");
  const [savingField, setSavingField] = useState(false);
  const [deletingFeature, setDeletingFeature] = useState(false);

  const taskById = useMemo(() => {
    const map = new Map<string, Task>();
    for (const t of tasks) map.set(t.id, t);
    return map;
  }, [tasks]);

  async function refreshBasics() {
    setLoading(true);
    setError(null);
    
    // Check cache for instant loading of recently created features
    try {
      const cached = sessionStorage.getItem(`feature_cache_${featureId}`);
      if (cached) {
        const cachedFeature = JSON.parse(cached);
        setFeature(cachedFeature);
        setEditName(cachedFeature.name);
        setEditDescription(cachedFeature.description);
        setEditCategory(cachedFeature.category);
        setEditStatus(cachedFeature.status);
        setEditTokens(String(cachedFeature.total_tokens_reward));
      }
    } catch (e) {
      // Ignore cache errors
    }
    
    try {
      const [fRes, tRes] = await Promise.all([
        getFeature(featureId),
        listTasks({ feature_id: featureId }),
      ]);
      setFeature(fRes.feature);
      setTasks(tRes.tasks);

      // Update edit state when feature loads
      if (fRes.feature) {
        setEditName(fRes.feature.name);
        setEditDescription(fRes.feature.description);
        setEditCategory(fRes.feature.category);
        setEditStatus(fRes.feature.status);
        setEditTokens(String(fRes.feature.total_tokens_reward));
      }

      // Auto-load contributions if there are tasks
      if (tRes.tasks.length > 0 && !contributionsLoaded) {
        await refreshContributions(tRes.tasks);
        setContributionsLoaded(true);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshContributions(tasksToUse?: Task[]) {
    const taskList = tasksToUse ?? tasks;
    if (taskList.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      const taskIds = taskList.map((t) => t.id);
      const results = await Promise.all(
        taskIds.map((id) => listContributions({ task_id: id })),
      );
      const all = results.flatMap((r) => r.contributions);
      setContributions(all);

      const ids = Array.from(
        new Set(all.map((c) => c.contributor_id).filter(Boolean)),
      );
      // Best-effort public contributor name resolution
      const toFetch = ids.filter((id) => !contributorsById[id]);
      if (toFetch.length) {
        const fetched = await Promise.all(
          toFetch.map(async (id) => {
            try {
              const r = await fetch("/api/public/contributors/get", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ id }),
              });
              if (!r.ok) return null;
              const json = (await r.json()) as {
                contributor: PublicContributor;
              };
              return json.contributor;
            } catch {
              return null;
            }
          }),
        );
        const next = { ...contributorsById };
        for (const c of fetched) {
          if (c) next[c.id] = c;
        }
        setContributorsById(next);
      }
      setContributionsLoaded(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshBasics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureId]);

  const tasksDone = useMemo(
    () => tasks.filter((t) => t.status === "DONE").length,
    [tasks],
  );
  const tasksTotal = tasks.length;
  const allTasksDone = tasksTotal > 0 && tasksDone === tasksTotal;

  const totalCpAwarded = useMemo(
    () =>
      contributions
        .filter((c) => c.status === "APPROVED" && c.cp_awarded !== null)
        .reduce((sum, c) => sum + (c.cp_awarded ?? 0), 0),
    [contributions],
  );

  const activeContributors = useMemo(() => {
    const claimerIds = new Set(
      tasks.map((t) => t.claimed_by_id).filter((id): id is string => !!id),
    );
    return claimerIds.size;
  }, [tasks]);

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

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-wider uppercase">
            <span className="text-muted-foreground">{">"}</span>
            {feature?.name ?? "FEATURE"}
          </h1>
          {feature ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge
                variant={
                  feature.status === "COMPLETED"
                    ? "default"
                    : feature.status === "IN_PROGRESS"
                      ? "secondary"
                      : feature.status === "CANCELLED"
                        ? "destructive"
                        : "outline"
                }
                className="gap-1"
              >
                {feature.status === "COMPLETED" ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : feature.status === "IN_PROGRESS" ? (
                  <Clock className="w-3 h-3" />
                ) : feature.status === "CANCELLED" ? (
                  <XCircle className="w-3 h-3" />
                ) : null}
                {feature.status}
              </Badge>
              <Badge variant="secondary">{feature.category}</Badge>
              <Tooltip content="Total token reward pool for this feature">
                <Badge
                  variant="default"
                  className="bg-primary/10 text-primary border-primary/30"
                >
                  {formatNumber(feature.total_tokens_reward)} CFT
                </Badge>
              </Tooltip>
              <Tooltip
                content={`${tasksDone} completed out of ${tasksTotal} total tasks`}
              >
                <Badge variant="outline">
                  Tasks: {tasksDone}/{tasksTotal}
                </Badge>
              </Tooltip>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {isAdmin &&
          allTasksDone &&
          feature &&
          (feature.status === "OPEN" || feature.status === "IN_PROGRESS") ? (
            <Button
              onClick={async () => {
                setError(null);
                if (!feature) return;
                const ok = window.confirm(
                  `Mark this feature as COMPLETED?\n\nAll ${tasksTotal} tasks are done. This will allow distributions to be created.`,
                );
                if (!ok) return;
                setLoading(true);
                try {
                  await updateFeature({
                    id: feature.id,
                    name: feature.name,
                    description: feature.description,
                    category: feature.category,
                    total_tokens_reward: feature.total_tokens_reward,
                    status: "COMPLETED",
                    deadline: feature.deadline,
                  });
                  await refreshBasics();
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Completing…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Mark Complete
                </>
              )}
            </Button>
          ) : null}
          {isAdmin && feature ? (
            <Button
              variant="destructive"
              onClick={async () => {
                setError(null);
                setSuccessMessage(null);
                if (!feature) return;

                // Safety check: prevent deletion if tasks exist
                if (tasks.length > 0) {
                  setError(
                    `Cannot delete feature: ${tasks.length} task(s) still exist. Please delete all tasks first to avoid orphan records.`
                  );
                  return;
                }

                const ok = window.confirm(
                  `⚠️ DELETE FEATURE?\n\nFeature: "${feature.name}"\n\nThis action cannot be undone. The feature will be permanently deleted.\n\nClick OK to confirm deletion.`
                );
                if (!ok) return;

                setDeletingFeature(true);
                try {
                  await deleteFeature(feature.id);
                  setSuccessMessage("Feature deleted successfully!");
                  // Redirect to features list after short delay
                  setTimeout(() => {
                    window.location.href = "/contribute/features";
                  }, 1000);
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setDeletingFeature(false);
                }
              }}
              disabled={loading || deletingFeature}
            >
              {deletingFeature ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Feature
                </>
              )}
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() => void refreshBasics()}
            disabled={loading}
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

      {feature ? (
        <Card className="p-4 border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/20 transition-all relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />
          <div className="relative space-y-4">
            {/* Feature Name */}
            <EditableTextField
              title="Feature Name"
              value={editName}
              isEditable={isAdmin}
              isEditing={editingName}
              isSaving={savingField}
              onEdit={() => {
                setEditName(feature.name);
                setEditingName(true);
              }}
              onCancel={() => setEditingName(false)}
              onChange={setEditName}
              onSave={async () => {
                setError(null);
                setSuccessMessage(null);
                setSavingField(true);
                try {
                  await updateFeature({
                    id: feature.id,
                    name: editName.trim(),
                    description: feature.description,
                    category: feature.category,
                    total_tokens_reward: feature.total_tokens_reward,
                    status: feature.status,
                    deadline: feature.deadline,
                  });
                  await refreshBasics();
                  setEditingName(false);
                  setSuccessMessage("Feature name updated successfully!");
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setSavingField(false);
                }
              }}
              placeholder="Feature name"
              className="mb-4"
            />

            {/* Feature Description */}
            <EditableTextField
              title="Description"
              value={editDescription}
              isEditable={isAdmin}
              isEditing={editingDescription}
              isSaving={savingField}
              onEdit={() => {
                setEditDescription(feature.description);
                setEditingDescription(true);
              }}
              onCancel={() => setEditingDescription(false)}
              onChange={setEditDescription}
              onSave={async () => {
                setError(null);
                setSuccessMessage(null);
                setSavingField(true);
                try {
                  await updateFeature({
                    id: feature.id,
                    name: feature.name,
                    description: editDescription.trim(),
                    category: feature.category,
                    total_tokens_reward: feature.total_tokens_reward,
                    status: feature.status,
                    deadline: feature.deadline,
                  });
                  await refreshBasics();
                  setEditingDescription(false);
                  setSuccessMessage("Feature description updated successfully!");
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setSavingField(false);
                }
              }}
              multiline
              placeholder="Feature description"
              className="mb-4"
            />

            {/* Feature Category */}
            <EditableTextField
              title="Category"
              value={editCategory}
              isEditable={isAdmin}
              isEditing={editingCategory}
              isSaving={savingField}
              onEdit={() => {
                setEditCategory(feature.category);
                setEditingCategory(true);
              }}
              onCancel={() => setEditingCategory(false)}
              onChange={setEditCategory}
              onSave={async () => {
                setError(null);
                setSuccessMessage(null);
                setSavingField(true);
                try {
                  await updateFeature({
                    id: feature.id,
                    name: feature.name,
                    description: feature.description,
                    category: editCategory.trim(),
                    total_tokens_reward: feature.total_tokens_reward,
                    status: feature.status,
                    deadline: feature.deadline,
                  });
                  await refreshBasics();
                  setEditingCategory(false);
                  setSuccessMessage("Feature category updated successfully!");
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setSavingField(false);
                }
              }}
              placeholder="Feature category"
              className="mb-4"
            />

            {/* Feature Status */}
            <EditableOptionsField
              title="Status"
              value={editStatus}
              options={["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const}
              isEditable={isAdmin}
              isEditing={editingStatus}
              isSaving={savingField}
              onEdit={() => {
                setEditStatus(feature.status);
                setEditingStatus(true);
              }}
              onCancel={() => setEditingStatus(false)}
              onChange={setEditStatus}
              onSave={async () => {
                setError(null);
                setSuccessMessage(null);
                setSavingField(true);
                try {
                  await updateFeature({
                    id: feature.id,
                    name: feature.name,
                    description: feature.description,
                    category: feature.category,
                    total_tokens_reward: feature.total_tokens_reward,
                    status: editStatus,
                    deadline: feature.deadline,
                  });
                  await refreshBasics();
                  setEditingStatus(false);
                  setSuccessMessage("Feature status updated successfully!");
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setSavingField(false);
                }
              }}
              renderDisplay={() => (
                <div className="mt-2">
                  <Badge
                    variant={
                      feature.status === "COMPLETED"
                        ? "default"
                        : feature.status === "IN_PROGRESS"
                          ? "secondary"
                          : feature.status === "CANCELLED"
                            ? "destructive"
                            : "outline"
                    }
                    className="gap-1"
                  >
                    {feature.status === "COMPLETED" ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : feature.status === "IN_PROGRESS" ? (
                      <Clock className="w-3 h-3" />
                    ) : feature.status === "CANCELLED" ? (
                      <XCircle className="w-3 h-3" />
                    ) : null}
                    {feature.status}
                  </Badge>
                </div>
              )}
              className="mb-4"
            />

            {/* Token Reward */}
            <EditableTextField
              title="Total Token Reward"
              value={editTokens}
              isEditable={isAdmin}
              isEditing={editingTokens}
              isSaving={savingField}
              onEdit={() => {
                setEditTokens(String(feature.total_tokens_reward));
                setEditingTokens(true);
              }}
              onCancel={() => setEditingTokens(false)}
              onChange={setEditTokens}
              onSave={async () => {
                setError(null);
                setSuccessMessage(null);
                const tokenValue = Number(editTokens.trim());
                if (!Number.isFinite(tokenValue) || tokenValue < 0) {
                  setError("Token reward must be a non-negative number");
                  return;
                }
                setSavingField(true);
                try {
                  await updateFeature({
                    id: feature.id,
                    name: feature.name,
                    description: feature.description,
                    category: feature.category,
                    total_tokens_reward: tokenValue,
                    status: feature.status,
                    deadline: feature.deadline,
                  });
                  await refreshBasics();
                  setEditingTokens(false);
                  setSuccessMessage("Token reward updated successfully!");
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setSavingField(false);
                }
              }}
              placeholder="0"
              className=""
            />
          </div>
        </Card>
      ) : (
        <Card className="p-4 border border-border/60 bg-card/60 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground relative">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading feature…
          </div>
        </Card>
      )}

      <Card className="p-4 border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/20 transition-all relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />
        <div className="flex items-center justify-between gap-2 relative">
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider">
            <span>{">"}</span> TASKS
          </h2>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Button
                variant="outline"
                onClick={() => setCreateTaskOpen((v) => !v)}
              >
                {createTaskOpen ? (
                  <>
                    <XCircle className="w-4 h-4" />
                    Close
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    New task
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </div>

        {/* Progress bar for tasks */}
        {feature && tasksTotal > 0 && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>Task Progress</span>
              <span>{Math.round((tasksDone / tasksTotal) * 100)}%</span>
            </div>
            <Progress value={(tasksDone / tasksTotal) * 100} className="h-2" />
            
            {/* Task status breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 text-xs font-mono">
              <div className="rounded-md border border-border/60 bg-background/50 p-2">
                <div className="text-muted-foreground">OPEN</div>
                <div className="font-semibold">
                  {tasks.filter((t) => t.status === "OPEN").length}
                </div>
              </div>
              <div className="rounded-md border border-border/60 bg-background/50 p-2">
                <div className="text-muted-foreground">CLAIMED</div>
                <div className="font-semibold">
                  {tasks.filter((t) => t.status === "CLAIMED").length}
                </div>
              </div>
              <div className="rounded-md border border-border/60 bg-background/50 p-2">
                <div className="text-muted-foreground">IN_REVIEW</div>
                <div className="font-semibold">
                  {tasks.filter((t) => t.status === "IN_REVIEW").length}
                </div>
              </div>
              <div className="rounded-md border border-border/60 bg-background/50 p-2">
                <div className="text-muted-foreground">CHANGES</div>
                <div className="font-semibold">
                  {tasks.filter((t) => t.status === "CHANGES_REQUESTED").length}
                </div>
              </div>
              <div className="rounded-md border border-primary/30 bg-primary/5 p-2">
                <div className="text-muted-foreground">DONE</div>
                <div className="font-semibold text-primary">{tasksDone}</div>
              </div>
            </div>

            {/* CP and contributor stats */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="rounded-md border border-border/60 bg-background/50 p-2">
                <div className="text-muted-foreground">Total CP Awarded</div>
                <div className="font-semibold">{totalCpAwarded}</div>
              </div>
              <div className="rounded-md border border-border/60 bg-background/50 p-2">
                <div className="text-muted-foreground">Active Contributors</div>
                <div className="font-semibold">{activeContributors}</div>
              </div>
            </div>

            {/* Completion alert for admins */}
            {isAdmin &&
            allTasksDone &&
            feature.status !== "COMPLETED" &&
            feature.status !== "CANCELLED" ? (
              <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-mono font-semibold text-primary">
                      All tasks completed!
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground font-mono">
                      This feature is ready to be marked as COMPLETED. Use the &ldquo;Mark
                      Complete&rdquo; button above to finalize it and enable token distributions.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Completion banner */}
            {feature.status === "COMPLETED" ? (
              <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-mono font-semibold text-primary">
                      Feature Completed
                    </p>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-muted-foreground">Total CP: </span>
                        <span className="font-semibold">{totalCpAwarded}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Contributors: </span>
                        <span className="font-semibold">{activeContributors}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tasks: </span>
                        <span className="font-semibold">{tasksDone}/{tasksTotal}</span>
                      </div>
                    </div>
                    {isAdmin ? (
                      <p className="mt-2 text-xs text-muted-foreground font-mono">
                        Ready to create distributions on the Distributions page.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {createTaskOpen && isAdmin ? (
          <div key={`create-task-${createTaskOpen}`} className="mt-4 rounded-md border border-border/60 bg-background p-3">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider">
              <span>{">"}</span> CREATE TASK FOR THIS FEATURE
            </h3>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label htmlFor="task-name" className="text-xs font-mono text-muted-foreground">
                  Task name
                </label>
                <Input
                  id="task-name"
                  name="taskName"
                  value={createTaskName}
                  onChange={(e) => setCreateTaskName(e.target.value)}
                  placeholder="Enter task name"
                  disabled={creatingTask}
                />
              </div>
              <div>
                <label htmlFor="task-type" className="text-xs font-mono text-muted-foreground">
                  Type
                </label>
                <select
                  id="task-type"
                  name="taskType"
                  value={createTaskType}
                  onChange={(e) =>
                    setCreateTaskType(e.target.value as Task["task_type"])
                  }
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm font-mono"
                  disabled={creatingTask}
                >
                  <option value="TECH">TECH</option>
                  <option value="DESIGN">DESIGN</option>
                  <option value="MARKETING">MARKETING</option>
                  <option value="BUSINESS">BUSINESS</option>
                  <option value="DOCS">DOCS</option>
                  <option value="GENERAL">GENERAL</option>
                </select>
              </div>
              <div>
                <label htmlFor="task-status" className="text-xs font-mono text-muted-foreground">
                  Status
                </label>
                <Input id="task-status" name="taskStatus" value="OPEN" disabled />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="task-description" className="text-xs font-mono text-muted-foreground">
                  Description
                </label>
                <textarea
                  id="task-description"
                  name="taskDescription"
                  value={createTaskDescription}
                  onChange={(e) => setCreateTaskDescription(e.target.value)}
                  className="w-full min-h-[120px] rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                  placeholder="Describe the task requirements"
                  disabled={creatingTask}
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="task-acceptance" className="text-xs font-mono text-muted-foreground">
                  Acceptance criteria
                </label>
                <textarea
                  id="task-acceptance"
                  name="taskAcceptance"
                  value={createTaskAcceptance}
                  onChange={(e) => setCreateTaskAcceptance(e.target.value)}
                  className="w-full min-h-[120px] rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                  placeholder="List the acceptance criteria"
                  disabled={creatingTask}
                />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Button
                variant={
                  createTaskName.trim() &&
                  createTaskAcceptance.trim() &&
                  createTaskDescription.trim()
                    ? "default"
                    : "outline"
                }
                disabled={
                  creatingTask ||
                  !createTaskName.trim() ||
                  !createTaskAcceptance.trim() ||
                  !createTaskDescription.trim()
                }
                onClick={async () => {
                  if (!feature) return;
                  setError(null);
                  setSuccessMessage(null);
                  setCreatingTask(true);
                  try {
                    await createTask({
                      feature_id: feature.id,
                      name: createTaskName.trim(),
                      description: createTaskDescription.trim(),
                      task_type: createTaskType,
                      acceptance_criteria: createTaskAcceptance.trim(),
                      status: "OPEN",
                    });
                    setCreateTaskName("");
                    setCreateTaskDescription("");
                    setCreateTaskAcceptance("");
                    setCreateTaskType("TECH");
                    setCreateTaskOpen(false);
                    setSuccessMessage("Task created successfully!");
                    await refreshBasics();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setCreatingTask(false);
                  }
                }}
              >
                {creatingTask ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create task"
                )}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-3 space-y-2 relative">
          {tasks.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl text-muted-foreground/30 font-mono mb-2">
                [ ]
              </div>
              <p className="text-sm text-muted-foreground font-mono">
                <span>{">"}</span> NO_TASKS_YET
              </p>
            </div>
          ) : null}

          {tasks
            .slice()
            .sort((a, b) => (a.created_date < b.created_date ? 1 : -1))
            .map((t) => {
              const statusIcon =
                t.status === "DONE" ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : t.status === "IN_REVIEW" ? (
                  <Clock className="w-3 h-3" />
                ) : t.status === "CHANGES_REQUESTED" ? (
                  <AlertCircle className="w-3 h-3" />
                ) : null;
              const statusVariant =
                t.status === "DONE"
                  ? ("default" as const)
                  : t.status === "IN_REVIEW"
                    ? ("secondary" as const)
                    : t.status === "CHANGES_REQUESTED"
                      ? ("destructive" as const)
                      : ("outline" as const);
              return (
                <TaskCard
                  key={t.id}
                  task={t}
                  featureId={featureId}
                  statusIcon={statusIcon}
                  statusVariant={statusVariant}
                />
              );
            })}
        </div>
      </Card>

      <Card className="p-4 border border-border/60 bg-background/60">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider">
            <span>{">"}</span> Submissions{" "}
          </h2>
        </div>
        <p className="mt-2 text-xs text-muted-foreground font-mono">
          All contributions for tasks in this feature (public). Admins can
          review here.
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
                          <span>{">"}</span> ADMIN:
                          REVIEW
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
                                await refreshContributions();
                                setSuccessMessage("Changes requested successfully!");
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
                                await refreshContributions();
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
                                await refreshContributions();
                                setSuccessMessage(`Contribution approved with ${cpValue} CP!`);
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
    </div>
  );
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function formatNumber(n: number): string {
  try {
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 6,
    }).format(n);
  } catch {
    return String(n);
  }
}
