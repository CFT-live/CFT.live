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
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { Tooltip } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

import {
  approveContribution,
  createTask,
  listContributions,
  listDistributions,
  listTasks,
  getFeature,
} from "./api/api";
import type {
  Contribution,
  Feature,
  Task,
} from "./api/types";
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


  const [reviewCp, setReviewCp] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});




  const taskById = useMemo(() => {
    const map = new Map<string, Task>();
    for (const t of tasks) map.set(t.id, t);
    return map;
  }, [tasks]);

  async function refreshBasics() {
    setLoading(true);
    setError(null);
    try {
      const [fRes, tRes, dRes] = await Promise.all([
        getFeature(featureId),
        listTasks({ feature_id: featureId }),
        listDistributions({ feature_id: featureId }),
      ]);
      setFeature(fRes.feature);
      setTasks(tRes.tasks);

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

  return (
    <div className="space-y-6 relative">
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

          {/* Progress bar for tasks */}
          {feature && tasksTotal > 0 && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>Task Progress</span>
                <span>{Math.round((tasksDone / tasksTotal) * 100)}%</span>
              </div>
              <Progress
                value={(tasksDone / tasksTotal) * 100}
                className="h-2"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
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
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider relative">
            <span className="text-primary">{">"}[</span> Description{" "}
            <span className="text-primary">]</span>
          </h2>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-foreground/90 font-mono leading-relaxed">
            {feature.description || "(no description)"}
          </pre>
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
            <span className="text-primary">{">"}[</span> TASKS{" "}
            <span className="text-primary">]</span>
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

        {createTaskOpen && isAdmin ? (
          <div className="mt-4 rounded-md border border-border/60 bg-background p-3">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider">
              <span className="text-primary">{">"}</span> ADMIN: CREATE TASK FOR
              THIS FEATURE
            </h3>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs font-mono text-muted-foreground">
                  Task name
                </label>
                <Input
                  value={createTaskName}
                  onChange={(e) => setCreateTaskName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground">
                  Type
                </label>
                <select
                  value={createTaskType}
                  onChange={(e) =>
                    setCreateTaskType(e.target.value as Task["task_type"])
                  }
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm font-mono"
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
                <label className="text-xs font-mono text-muted-foreground">
                  Status
                </label>
                <Input value="OPEN" disabled />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-mono text-muted-foreground">
                  Description
                </label>
                <textarea
                  value={createTaskDescription}
                  onChange={(e) => setCreateTaskDescription(e.target.value)}
                  className="w-full min-h-[120px] rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-mono text-muted-foreground">
                  Acceptance criteria
                </label>
                <textarea
                  value={createTaskAcceptance}
                  onChange={(e) => setCreateTaskAcceptance(e.target.value)}
                  className="w-full min-h-[120px] rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
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
                  !createTaskName.trim() ||
                  !createTaskAcceptance.trim() ||
                  !createTaskDescription.trim()
                }
                onClick={async () => {
                  if (!feature) return;
                  setError(null);
                  try {
                    await createTask({
                      feature_id: feature.id,
                      name: createTaskName.trim(),
                      description: createTaskDescription,
                      task_type: createTaskType,
                      acceptance_criteria: createTaskAcceptance,
                      status: "OPEN",
                    });
                    setCreateTaskName("");
                    setCreateTaskDescription("");
                    setCreateTaskAcceptance("");
                    setCreateTaskType("TECH");
                    setCreateTaskOpen(false);
                    await refreshBasics();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  }
                }}
              >
                Create task
              </Button>
              <span className="text-xs text-muted-foreground font-mono">
                Feature: {featureId}
              </span>
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
                <span className="text-primary">{">"}</span> NO_TASKS_YET
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
                <div
                  key={t.id}
                  className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between rounded-md border border-border/60 bg-card hover:bg-card/80 hover:border-primary/30 transition-all px-3 py-2 group"
                >
                  <div className="space-y-1">
                    <Link
                      href={`/contribute/features/${featureId}/tasks/${t.id}`}
                      className="font-mono font-semibold hover:text-primary group-hover:text-primary transition-colors"
                      style={{ textDecoration: "none" }}
                    >
                      <span className="text-primary text-xs">{">"}</span>{" "}
                      {t.name}
                    </Link>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={statusVariant} className="gap-1">
                        {statusIcon}
                        {t.status}
                      </Badge>
                      <Badge variant="secondary">{t.task_type}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" asChild>
                      <Link
                        href={`/contribute/features/${featureId}/tasks/${t.id}`}
                      >
                        Open
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
        </div>
      </Card>

      <Card className="p-4 border border-border/60 bg-background/60">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider">
            <span className="text-primary">{">"}[</span> Submissions{" "}
            <span className="text-primary">]</span>
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
              <span className="text-primary">{">"}</span> NO_SUBMISSIONS_YET
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
                          <span className="text-primary">{">"}</span> ADMIN:
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
