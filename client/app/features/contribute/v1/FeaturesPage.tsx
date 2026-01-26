"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";

import { createFeature, listFeatures } from "./api/api";
import type { Feature, FeatureStatus } from "./api/types";
import { useContributorProfile } from "./hooks/useContributorProfile";

export default function FeaturesPage() {
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const { isAdmin, hasProfile, contributor, isLoading: profileLoading, ensureProfile } =
    useContributorProfile(address);

  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCategory, setCreateCategory] = useState("Technical");
  const [createDescription, setCreateDescription] = useState("");
  const [createTokens, setCreateTokens] = useState<string>("1000");
  const [createDeadline, setCreateDeadline] = useState<string>("");
  const [createStatus, setCreateStatus] = useState<FeatureStatus>("OPEN");

  const canCreate = useMemo(() => {
    return (
      isAdmin &&
      createName.trim().length > 0 &&
      createCategory.trim().length > 0 &&
      Number.isFinite(Number(createTokens))
    );
  }, [createCategory, createName, createTokens, isAdmin]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await listFeatures();
      setFeatures(res.features);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-wider">
            Features
          </h1>
          <p className="text-sm text-muted-foreground">
            Fixed token budgets with transparent CP and payouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isConnected ? (
            <Button variant="outline" onClick={() => open()}>
              Connect wallet
            </Button>
          ) : hasProfile === null ? (
            <Button
              variant="outline"
              onClick={() => void ensureProfile()}
              disabled={profileLoading}
            >
              {profileLoading ? "Connecting…" : "Connect profile"}
            </Button>
          ) : hasProfile === true && contributor ? (
            <Button variant="outline" disabled>
              Profile: {contributor.username}
            </Button>
          ) : null}

          {isAdmin ? (
            <Button variant="outline" onClick={() => setCreateOpen((v) => !v)}>
              {createOpen ? "Close" : "New feature"}
            </Button>
          ) : null}

          <Button onClick={() => void refresh()} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </div>

      {createOpen && isAdmin ? (
        <Card className="p-4 border border-border/60 bg-background/60">
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider">
            Create feature
          </h2>
          <p className="mt-2 text-xs text-muted-foreground font-mono">
            Token pool is fixed at creation (v1).
          </p>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Name
              </label>
              <Input value={createName} onChange={(e) => setCreateName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Category
              </label>
              <Input
                value={createCategory}
                onChange={(e) => setCreateCategory(e.target.value)}
                placeholder="Technical, Marketing, Docs…"
              />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Total CFT reward
              </label>
              <Input
                value={createTokens}
                onChange={(e) => setCreateTokens(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Status
              </label>
              <Input
                value={createStatus}
                onChange={(e) => setCreateStatus(e.target.value as FeatureStatus)}
                placeholder="OPEN"
              />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Deadline (optional, ISO)
              </label>
              <Input
                value={createDeadline}
                onChange={(e) => setCreateDeadline(e.target.value)}
                placeholder="2026-02-01T00:00:00.000Z"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Description
              </label>
              <textarea
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                className="w-full min-h-[140px] rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button
              disabled={!canCreate}
              onClick={async () => {
                setError(null);
                try {
                  const tokens = Number(createTokens);
                  if (!Number.isFinite(tokens) || tokens < 0) {
                    setError("Total CFT reward must be a non-negative number");
                    return;
                  }
                  await createFeature({
                    name: createName.trim(),
                    category: createCategory.trim(),
                    description: createDescription,
                    total_tokens_reward: tokens,
                    status: createStatus,
                    deadline: createDeadline.trim() ? createDeadline.trim() : null,
                  });
                  setCreateName("");
                  setCreateDescription("");
                  setCreateTokens("1000");
                  setCreateDeadline("");
                  setCreateCategory("Technical");
                  setCreateStatus("OPEN");
                  setCreateOpen(false);
                  await refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              Create
            </Button>
            {address ? (
              <span className="text-xs text-muted-foreground font-mono">
                Connected: {address.slice(0, 6)}…{address.slice(-4)}
              </span>
            ) : null}
          </div>
        </Card>
      ) : null}

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        {features.length === 0 ? (
          <Card className="p-4 border border-border/60 bg-background/60">
            <p className="text-sm text-muted-foreground">No features found.</p>
          </Card>
        ) : null}

        {features
          .slice()
          .sort((a, b) => (a.created_date < b.created_date ? 1 : -1))
          .map((f) => (
            <Card key={f.id} className="p-4 border border-border/60 bg-background/60">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <Link
                    href={`/contribute/features/${f.id}`}
                    className="text-base md:text-lg font-mono font-semibold hover:text-primary transition-colors"
                    style={{ textDecoration: "none" }}
                  >
                    {f.name}
                  </Link>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{f.status}</Badge>
                    <Badge variant="secondary">{f.category}</Badge>
                    <Badge variant="outline">{formatNumber(f.total_tokens_reward)} CFT</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    Created {formatTime(f.created_date)}
                    {f.deadline ? ` · Deadline ${formatTime(f.deadline)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" asChild>
                    <Link href={`/contribute/features/${f.id}`}>Open</Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
      </div>
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
