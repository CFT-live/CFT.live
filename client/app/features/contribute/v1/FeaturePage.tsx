"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";

import {
  approveContribution,
  createTask,
  createDistribution,
  listContributions,
  listDistributions,
  listTasks,
  getFeature,
  updateFeature,
  updateDistribution,
} from "./api/api";
import type {
  Contribution,
  Feature,
  FeatureDistribution,
  Task,
  TransactionStatus,
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
  const { isAdmin, ensureProfile } = useContributorProfile(address);

  const [feature, setFeature] = useState<Feature | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [distributions, setDistributions] = useState<FeatureDistribution[]>([]);
  const [contributorsById, setContributorsById] = useState<Record<string, PublicContributor>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loadContribs, setLoadContribs] = useState(false);
  const [creatingDistributions, setCreatingDistributions] = useState(false);
  const [completingFeature, setCompletingFeature] = useState(false);

  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTaskName, setCreateTaskName] = useState("");
  const [createTaskDescription, setCreateTaskDescription] = useState("");
  const [createTaskAcceptance, setCreateTaskAcceptance] = useState("");
  const [createTaskType, setCreateTaskType] = useState<Task["task_type"]>("TECH");

  const [txStatusDefault, setTxStatusDefault] = useState<TransactionStatus>("Pending");

  const [distTxHash, setDistTxHash] = useState<Record<string, string>>({});
  const [distTxStatus, setDistTxStatus] = useState<Record<string, TransactionStatus>>({});
  const [savingDistributionId, setSavingDistributionId] = useState<string | null>(null);

  const [reviewCp, setReviewCp] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const approved = useMemo(
    () => contributions.filter((c) => c.status === "APPROVED" && typeof c.cp_awarded === "number"),
    [contributions]
  );

  const leaderboard = useMemo(() => {
    const sums = new Map<string, number>();
    for (const c of approved) {
      const prev = sums.get(c.contributor_id) ?? 0;
      sums.set(c.contributor_id, prev + (c.cp_awarded ?? 0));
    }
    return Array.from(sums.entries())
      .map(([contributor_id, cp]) => ({ contributor_id, cp }))
      .sort((a, b) => b.cp - a.cp);
  }, [approved]);

  const totalApprovedCp = useMemo(() => leaderboard.reduce((acc, x) => acc + x.cp, 0), [leaderboard]);

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
      setDistributions(dRes.distributions);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function refreshContributions() {
    setLoading(true);
    setError(null);
    try {
      const taskIds = tasks.map((t) => t.id);
      const results = await Promise.all(taskIds.map((id) => listContributions({ task_id: id })));
      const all = results.flatMap((r) => r.contributions);
      setContributions(all);

      const ids = Array.from(new Set(all.map((c) => c.contributor_id).filter(Boolean)));
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
              const json = (await r.json()) as { contributor: PublicContributor };
              return json.contributor;
            } catch {
              return null;
            }
          })
        );
        const next = { ...contributorsById };
        for (const c of fetched) {
          if (c) next[c.id] = c;
        }
        setContributorsById(next);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshBasics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureId]);

  useEffect(() => {
    if (address) void ensureProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  useEffect(() => {
    if (loadContribs && tasks.length > 0) {
      void refreshContributions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadContribs, tasks.length]);

  useEffect(() => {
    // Initialize editable tx fields from loaded ledger data
    if (!distributions.length) return;
    setDistTxHash((prev) => {
      const next = { ...prev };
      for (const d of distributions) {
        if (next[d.id] === undefined) next[d.id] = d.arbitrum_tx_hash ?? "";
      }
      return next;
    });
    setDistTxStatus((prev) => {
      const next = { ...prev };
      for (const d of distributions) {
        if (next[d.id] === undefined) next[d.id] = d.transaction_status;
      }
      return next;
    });
  }, [distributions]);

  const tasksDone = useMemo(() => tasks.filter((t) => t.status === "DONE").length, [tasks]);
  const tasksTotal = tasks.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
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
            {feature?.name ?? "Feature"}
          </h1>
          {feature ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">{feature.status}</Badge>
              <Badge variant="secondary">{feature.category}</Badge>
              <Badge variant="outline">{formatNumber(feature.total_tokens_reward)} CFT</Badge>
              <Badge variant="outline">
                Tasks: {tasksDone}/{tasksTotal}
              </Badge>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void refreshBasics()} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
          <Button
            variant={loadContribs ? "secondary" : "outline"}
            onClick={() => setLoadContribs(true)}
            disabled={loading || loadContribs}
          >
            {loadContribs ? "Contributions loaded" : "Load contributions"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {feature ? (
        <Card className="p-4 border border-border/60 bg-background/60">
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider">
            Description
          </h2>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-foreground/90 font-mono leading-relaxed">
            {feature.description || "(no description)"}
          </pre>
        </Card>
      ) : (
        <Card className="p-4 border border-border/60 bg-background/60">
          <p className="text-sm text-muted-foreground">Loading feature…</p>
        </Card>
      )}

      <Card className="p-4 border border-border/60 bg-background/60">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider">
            Tasks
          </h2>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Button variant="outline" onClick={() => setCreateTaskOpen((v) => !v)}>
                {createTaskOpen ? "Close" : "New task"}
              </Button>
            ) : null}
          </div>
        </div>

        {createTaskOpen && isAdmin ? (
          <div className="mt-4 rounded-md border border-border/60 bg-background p-3">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider">
              Create task for this feature
            </h3>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Task name
                </label>
                <Input value={createTaskName} onChange={(e) => setCreateTaskName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Type
                </label>
                <select
                  value={createTaskType}
                  onChange={(e) => setCreateTaskType(e.target.value as Task["task_type"])}
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
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Status
                </label>
                <Input value="OPEN" disabled />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Description
                </label>
                <textarea
                  value={createTaskDescription}
                  onChange={(e) => setCreateTaskDescription(e.target.value)}
                  className="w-full min-h-[120px] rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
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
                disabled={!createTaskName.trim() || !createTaskAcceptance.trim() || !createTaskDescription.trim()}
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
              <span className="text-xs text-muted-foreground font-mono">Feature: {featureId}</span>
            </div>
          </div>
        ) : null}

        <div className="mt-3 space-y-2">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks for this feature yet.</p>
          ) : null}

          {tasks
            .slice()
            .sort((a, b) => (a.created_date < b.created_date ? 1 : -1))
            .map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between rounded-md border border-border/60 bg-background px-3 py-2"
              >
                <div className="space-y-1">
                  <Link
                    href={`/contribute/features/${featureId}/tasks/${t.id}`}
                    className="font-mono font-semibold hover:text-primary"
                    style={{ textDecoration: "none" }}
                  >
                    {t.name}
                  </Link>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{t.status}</Badge>
                    <Badge variant="secondary">{t.task_type}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" asChild>
                    <Link href={`/contribute/features/${featureId}/tasks/${t.id}`}>Open</Link>
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </Card>

      <Card className="p-4 border border-border/60 bg-background/60">
        <h2 className="text-sm font-mono font-semibold uppercase tracking-wider">
          CP Leaderboard
        </h2>
        <p className="mt-2 text-xs text-muted-foreground font-mono">
          Based on APPROVED contributions for tasks in this feature.
        </p>

        {!loadContribs ? (
          <p className="mt-3 text-sm text-muted-foreground">Click “Load contributions” to compute standings.</p>
        ) : leaderboard.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No approved CP yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            <div className="text-xs text-muted-foreground font-mono">
              Total approved CP: {formatNumber(totalApprovedCp)}
            </div>
            {leaderboard.map((row) => {
              const user = contributorsById[row.contributor_id];
              const label = user?.username ?? `${row.contributor_id.slice(0, 6)}…${row.contributor_id.slice(-4)}`;
              const share = totalApprovedCp > 0 ? row.cp / totalApprovedCp : 0;
              const tokens = feature ? share * feature.total_tokens_reward : 0;
              return (
                <div
                  key={row.contributor_id}
                  className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2 font-mono"
                >
                  <span>{label}</span>
                  <span className="text-muted-foreground">
                    {formatNumber(row.cp)} CP · {formatPct(share)} · ~{formatNumber(tokens)} CFT
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-4 border border-border/60 bg-background/60">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider">
            Submissions
          </h2>
          <Button
            variant="outline"
            onClick={() => setLoadContribs(true)}
            disabled={loading || loadContribs}
          >
            {loadContribs ? "Loaded" : "Load"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground font-mono">
          All contributions for tasks in this feature (public). Admins can review here.
        </p>

        {!loadContribs ? (
          <p className="mt-3 text-sm text-muted-foreground">Click “Load” to fetch submissions.</p>
        ) : contributions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No submissions yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {contributions
              .slice()
              .sort((a, b) => (a.submission_date < b.submission_date ? 1 : -1))
              .map((c) => {
                const taskName = taskById.get(c.task_id)?.name ?? c.task_id;
                return (
                  <div key={c.id} className="rounded-md border border-border/60 bg-background px-3 py-2">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{c.status}</Badge>
                        {typeof c.cp_awarded === "number" ? (
                          <Badge variant="secondary">{c.cp_awarded} CP</Badge>
                        ) : null}
                        <Badge variant="outline">{taskName}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {contributorsById[c.contributor_id]?.username ?? `${c.contributor_id.slice(0, 6)}…${c.contributor_id.slice(-4)}`} · {formatTime(c.submission_date)}
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

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button variant="outline" asChild>
                        <Link href={`/contribute/${c.task_id}`}>Open task</Link>
                      </Button>
                    </div>

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
                              Notes
                            </label>
                            <Input
                              value={reviewNotes[c.id] ?? ""}
                              onChange={(e) =>
                                setReviewNotes((prev) => ({ ...prev, [c.id]: e.target.value }))
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
                                  approval_notes: (reviewNotes[c.id] ?? "").trim() || null,
                                });
                                await refreshContributions();
                              } catch (e) {
                                setError(e instanceof Error ? e.message : String(e));
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
                                  approval_notes: (reviewNotes[c.id] ?? "").trim() || null,
                                });
                                await refreshContributions();
                              } catch (e) {
                                setError(e instanceof Error ? e.message : String(e));
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
                                  approval_notes: (reviewNotes[c.id] ?? "").trim() || null,
                                });
                                await refreshContributions();
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
                );
              })}
          </div>
        )}
      </Card>

      <Card className="p-4 border border-border/60 bg-background/60">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider">
            Distribution Ledger
          </h2>
          <Button variant="outline" onClick={() => void refreshBasics()} disabled={loading}>
            Refresh
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground font-mono">
          Public payout records with Arbitrum transaction hashes.
        </p>

        {distributions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No distributions recorded yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {distributions
              .slice()
              .sort((a, b) => (a.distribution_date < b.distribution_date ? 1 : -1))
              .map((d) => (
                <div
                  key={d.id}
                  className="rounded-md border border-border/60 bg-background px-3 py-2 font-mono"
                >
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <span className="text-sm">
                      {contributorsById[d.contributor_id]?.username ??
                        `${d.contributor_id.slice(0, 6)}…${d.contributor_id.slice(-4)}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatNumber(d.cp_amount)} CP → {formatNumber(d.token_amount)} CFT · {d.transaction_status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {d.arbitrum_tx_hash ? (
                      <a
                        href={arbiscanTxUrl(d.arbitrum_tx_hash)}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-primary"
                      >
                        Tx: {shortHash(d.arbitrum_tx_hash)}
                      </a>
                    ) : (
                      <span>Tx: (missing)</span>
                    )}
                    <span> · {formatTime(d.distribution_date)}</span>
                  </div>

                  {isAdmin ? (
                    <div className="mt-3 rounded-md border border-border/60 bg-background p-3">
                      <div className="text-xs font-mono font-semibold uppercase tracking-wider">
                        Admin: Update tx
                      </div>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="md:col-span-2">
                          <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                            Arbitrum tx hash
                          </label>
                          <Input
                            value={distTxHash[d.id] ?? ""}
                            onChange={(e) =>
                              setDistTxHash((prev) => ({ ...prev, [d.id]: e.target.value }))
                            }
                            placeholder="0x…"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                            Status
                          </label>
                          <select
                            value={distTxStatus[d.id] ?? d.transaction_status}
                            onChange={(e) =>
                              setDistTxStatus((prev) => ({
                                ...prev,
                                [d.id]: e.target.value as TransactionStatus,
                              }))
                            }
                            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm font-mono"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Failed">Failed</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          disabled={savingDistributionId === d.id || !address}
                          onClick={async () => {
                            setError(null);
                            if (!address) {
                              setError("Connect wallet to update distribution");
                              return;
                            }
                            setSavingDistributionId(d.id);
                            try {
                              const rawHash = (distTxHash[d.id] ?? "").trim();
                              const nextHash = rawHash ? rawHash : null;

                              await updateDistribution({
                                id: d.id,
                                transaction_status: distTxStatus[d.id] ?? d.transaction_status,
                                arbitrum_tx_hash: nextHash,
                              });
                              await refreshBasics();
                            } catch (e) {
                              setError(e instanceof Error ? e.message : String(e));
                            } finally {
                              setSavingDistributionId(null);
                            }
                          }}
                        >
                          {savingDistributionId === d.id ? "Saving…" : "Save"}
                        </Button>
                        <span className="text-xs text-muted-foreground font-mono">
                          Leave hash empty to clear.
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
          </div>
        )}

        {isAdmin && feature && feature.status !== "COMPLETED" ? (
          <div className="mt-4 rounded-md border border-border/60 bg-background p-3">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider">
              Admin: Complete feature
            </h3>
            <p className="mt-2 text-xs text-muted-foreground font-mono">
              Distributions can only be created after the feature is marked COMPLETED.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="outline"
                disabled={completingFeature || !address}
                onClick={async () => {
                  if (!feature) return;
                  if (!address) {
                    setError("Connect wallet to complete feature");
                    return;
                  }
                  setCompletingFeature(true);
                  setError(null);
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
                    setCompletingFeature(false);
                  }
                }}
              >
                {completingFeature ? "Completing…" : "Mark as COMPLETED"}
              </Button>
              <span className="text-xs text-muted-foreground font-mono">
                This does not send tokens on-chain.
              </span>
            </div>
          </div>
        ) : null}

        {isAdmin && feature && feature.status === "COMPLETED" ? (
          <div className="mt-4 rounded-md border border-border/60 bg-background p-3">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider">
              Admin: Create distributions from CP
            </h3>
            <p className="mt-2 text-xs text-muted-foreground font-mono">
              Calculates each contributor’s share using approved CP and creates ledger records (transaction hash can be added later).
            </p>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Default tx status
                </label>
                <select
                  value={txStatusDefault}
                  onChange={(e) => setTxStatusDefault(e.target.value as TransactionStatus)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm font-mono"
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  disabled={creatingDistributions || !loadContribs || totalApprovedCp <= 0 || !address}
                  onClick={async () => {
                    if (!feature) return;
                    if (!address) {
                      setError("Connect wallet to create distributions");
                      return;
                    }
                    setCreatingDistributions(true);
                    setError(null);
                    try {
                      const existingByContributor = new Set(distributions.map((d) => d.contributor_id));
                      for (const row of leaderboard) {
                        if (existingByContributor.has(row.contributor_id)) continue;
                        const share = row.cp / totalApprovedCp;
                        const tokenAmount = share * feature.total_tokens_reward;
                        await createDistribution({
                          feature_id: feature.id,
                          contributor_id: row.contributor_id,
                          cp_amount: row.cp,
                          token_amount: tokenAmount,
                          transaction_status: txStatusDefault,
                          arbitrum_tx_hash: null,
                        });
                      }
                      await refreshBasics();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : String(e));
                    } finally {
                      setCreatingDistributions(false);
                    }
                  }}
                >
                  {creatingDistributions ? "Creating…" : "Create missing distribution records"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
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
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(n);
  } catch {
    return String(n);
  }
}

function formatPct(x: number): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 2 }).format(x);
  } catch {
    return `${(x * 100).toFixed(2)}%`;
  }
}

function shortHash(hash: string): string {
  if (!hash) return "";
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

function arbiscanTxUrl(hash: string): string {
  return `https://arbiscan.io/tx/${hash}`;
}
