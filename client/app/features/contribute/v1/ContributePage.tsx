"use client";

import { useEffect, useState } from "react";

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
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";

import {
  listTasks,
} from "./api/api";
import type {
  Task,
  TaskStatus,
  TaskType,
} from "./api/types";

export default function ContributePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<TaskStatus | "ALL">("OPEN");
  const [type, setType] = useState<TaskType | "ALL">("ALL");
  const [q, setQ] = useState<string>("");

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await listTasks({
        status: status || undefined,
        type: type || undefined,
        q: q || undefined,
      });
      setTasks(res.tasks);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-wider">
            Tasks
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse tasks across all features.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/contribute/features">View features</Link>
          </Button>
          <Button onClick={() => void refresh()} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </div>

      <Card className="p-4 border border-border/60 bg-background/60">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Status
            </label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as TaskStatus | "ALL")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value || "__all"} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Type
            </label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as TaskType | "ALL")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value || "__all"} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Search
            </label>
            <div className="flex gap-2">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="name/description"
              />
              <Button
                variant="outline"
                onClick={() => void refresh()}
                disabled={loading}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <Card className="p-4 border border-border/60 bg-background/60">
            <p className="text-sm text-muted-foreground">No tasks found.</p>
          </Card>
        ) : null}

        {tasks.map((t) => (
          <Card
            key={t.id}
            className="p-4 border border-border/60 bg-background/60"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <Link
                  href={`/contribute/features/${t.feature_id}/tasks/${t.id}`}
                  className="text-base md:text-lg font-mono font-semibold hover:text-primary transition-colors"
                  style={{ textDecoration: "none" }}
                >
                  {t.name}
                </Link>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{t.status}</Badge>
                  <Badge variant="secondary">{t.task_type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  Created {formatTime(t.created_date)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/contribute/features/${t.feature_id}/tasks/${t.id}`}>Open</Link>
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "CLAIMED", label: "Claimed" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "CHANGES_REQUESTED", label: "Changes requested" },
  { value: "DONE", label: "Done" },
];

const TYPE_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "TECH", label: "Tech" },
  { value: "DESIGN", label: "Design" },
  { value: "MARKETING", label: "Marketing" },
  { value: "BUSINESS", label: "Business" },
  { value: "DOCS", label: "Docs" },
  { value: "GENERAL", label: "General" },
];

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}