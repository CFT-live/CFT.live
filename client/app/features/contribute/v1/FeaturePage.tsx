"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";

import { AlertBanner } from "./components/AlertBanner";
import { FeatureHeader } from "./components/FeatureHeader";
import { FeatureDetailsCard } from "./components/FeatureDetailsCard";
import { TasksSection } from "./components/TasksSection";
import { SubmissionsSection } from "./components/SubmissionsSection";
import { DistributionPreviewSection } from "./components/DistributionPreviewSection";

import {
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deletingFeature, setDeletingFeature] = useState(false);

  const [contributionsLoaded, setContributionsLoaded] = useState(false);

  const taskById = useMemo(() => {
    const map = new Map<string, Task>();
    for (const t of tasks) map.set(t.id, t);
    return map;
  }, [tasks]);

  async function refreshBasics() {
    setLoading(true);
    setError(null);

    try {
      const [fRes, tRes] = await Promise.all([
        getFeature(featureId),
        listTasks({ feature_id: featureId }),
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

  const handleMarkComplete = async () => {
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
        discussions_url: feature.discussions_url,
      });
      await refreshBasics();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFeature = async () => {
    setError(null);
    setSuccessMessage(null);
    if (!feature) return;

    // Safety check: prevent deletion if tasks exist
    if (tasks.length > 0) {
      setError(
        `Cannot delete feature: ${tasks.length} task(s) still exist. Please delete all tasks first to avoid orphan records.`,
      );
      return;
    }

    const ok = window.confirm(
      `⚠️ DELETE FEATURE?\n\nFeature: "${feature.name}"\n\nThis action cannot be undone. The feature will be permanently deleted.\n\nClick OK to confirm deletion.`,
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
  };

  return (
    <div className="space-y-6 relative">
      {/* Error Alert */}
      {error && (
        <AlertBanner
          type="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Success Alert */}
      {successMessage && (
        <AlertBanner
          type="success"
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}

      <FeatureHeader
        feature={feature}
        tasksDone={tasksDone}
        tasksTotal={tasksTotal}
        allTasksDone={allTasksDone}
        isAdmin={isAdmin}
        loading={loading}
        deletingFeature={deletingFeature}
        onMarkComplete={handleMarkComplete}
        onDeleteFeature={handleDeleteFeature}
        onRefresh={() => void refreshBasics()}
      />

      <FeatureDetailsCard
        feature={feature}
        isAdmin={isAdmin}
        onUpdate={refreshBasics}
        onError={setError}
        onSuccess={setSuccessMessage}
      />

      <TasksSection
        feature={feature}
        tasks={tasks}
        tasksDone={tasksDone}
        tasksTotal={tasksTotal}
        totalCpAwarded={totalCpAwarded}
        activeContributors={activeContributors}
        allTasksDone={allTasksDone}
        isAdmin={isAdmin}
        featureId={featureId}
        onRefresh={refreshBasics}
        onError={setError}
        onSuccess={setSuccessMessage}
      />

      <SubmissionsSection
        contributions={contributions}
        contributorsById={contributorsById}
        taskById={taskById}
        isAdmin={isAdmin}
        loading={loading}
        onRefresh={refreshContributions}
        onError={setError}
        onSuccess={setSuccessMessage}
      />

      <DistributionPreviewSection
        feature={feature}
        contributions={contributions}
        contributorsById={contributorsById}
        totalCpAwarded={totalCpAwarded}
      />
    </div>
  );
}
