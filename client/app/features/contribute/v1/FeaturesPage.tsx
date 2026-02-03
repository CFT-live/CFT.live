"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Filter,
  SortAsc,
  X as XIcon,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

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
import { Tooltip } from "@/components/ui/tooltip";

import { createFeature, listFeatures } from "./api/api";
import type { Feature, FeatureStatus } from "./api/types";
import { useContributorProfile } from "./hooks/useContributorProfile";
import { EmptyState } from "./components/EmptyState";
import { FeatureCard } from "./components/FeatureCard";

export default function FeaturesPage() {
  const { address } = useAppKitAccount();
  const { isAdmin } = useContributorProfile(address);

  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FeatureStatus | "ALL">(
    "ALL",
  );
  const [sortBy, setSortBy] = useState<"date" | "tokens" | "name">("date");

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

  // Filter and sort features
  const filteredFeatures = useMemo(() => {
    let filtered = features;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.description.toLowerCase().includes(query) ||
          f.category.toLowerCase().includes(query),
      );
    }

    // Apply status filter
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((f) => f.status === statusFilter);
    }

    // Apply sorting
    filtered = filtered.slice().sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "tokens":
          return b.total_tokens_reward - a.total_tokens_reward;
        case "date":
        default:
          return a.created_date < b.created_date ? 1 : -1;
      }
    });

    return filtered;
  }, [features, searchQuery, statusFilter, sortBy]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await listFeatures();
      setFeatures(res.features);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-wider uppercase">
            <span className="text-muted-foreground">{">"}</span> All features
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse and contribute to open features.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Button variant="outline" onClick={() => setCreateOpen((v) => !v)}>
              {createOpen ? (
                <>
                  <XIcon className="w-4 h-4" />
                  Close
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  New feature
                </>
              )}
            </Button>
          ) : null}

          <Button
            variant="outline"
            onClick={() => void refresh()}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading…
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

      {/* Search and Filter Section */}
      <Card className="p-4 border border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search features by name, description, or category..."
              className="pl-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Tooltip content="Filter by status">
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v as FeatureStatus | "ALL")
                }
              >
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </Tooltip>
            <Tooltip content="Sort features">
              <Select
                value={sortBy}
                onValueChange={(v) =>
                  setSortBy(v as "date" | "tokens" | "name")
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SortAsc className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">By Date</SelectItem>
                  <SelectItem value="tokens">By Tokens</SelectItem>
                  <SelectItem value="name">By Name</SelectItem>
                </SelectContent>
              </Select>
            </Tooltip>
          </div>
        </div>
        {(searchQuery || statusFilter !== "ALL") && (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>
              Showing {filteredFeatures.length} of {features.length} feature
              {features.length !== 1 ? "s" : ""}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
              className="h-auto py-1"
            >
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      {createOpen && isAdmin ? (
        <Card className="p-4 border-2 border-primary/30 bg-card/80 backdrop-blur-sm shadow-lg shadow-primary/5 relative overflow-hidden">
          {/* Scan line effect */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider relative">
            <span className="text-primary">{">"}[</span> Create Feature{" "}
            <span className="text-primary">]</span>
          </h2>
          <p className="mt-2 text-xs text-muted-foreground font-mono">
            Token pool is fixed at creation (v1).
          </p>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-mono text-muted-foreground">
                Name
              </label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground">
                Category
              </label>
              <Input
                value={createCategory}
                onChange={(e) => setCreateCategory(e.target.value)}
                placeholder="Technical, Marketing, Docs…"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground">
                Total CFT reward
              </label>
              <Input
                value={createTokens}
                onChange={(e) => setCreateTokens(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground">
                Status
              </label>
              <Input
                value={createStatus}
                onChange={(e) =>
                  setCreateStatus(e.target.value as FeatureStatus)
                }
                placeholder="OPEN"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground">
                Deadline (optional, ISO)
              </label>
              <Input
                value={createDeadline}
                onChange={(e) => setCreateDeadline(e.target.value)}
                placeholder="2026-02-01T00:00:00.000Z"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-mono text-muted-foreground">
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
              variant={canCreate ? "default" : "outline"}
              disabled={!canCreate}
              onClick={async () => {
                setError(null);
                setSuccessMessage(null);
                try {
                  const tokens = Number(createTokens);
                  if (!Number.isFinite(tokens) || tokens < 0) {
                    setError("Total CFT reward must be a non-negative number");
                    return;
                  }
                  const result = await createFeature({
                    name: createName.trim(),
                    category: createCategory.trim(),
                    description: createDescription,
                    total_tokens_reward: tokens,
                    status: createStatus,
                    deadline: createDeadline.trim()
                      ? createDeadline.trim()
                      : null,
                  });
                  
                  // Cache the newly created feature for instant loading
                  try {
                    sessionStorage.setItem(
                      `feature_cache_${result.feature.id}`,
                      JSON.stringify(result.feature)
                    );
                  } catch (e) {
                    // Ignore cache errors
                  }
                  
                  setCreateName("");
                  setCreateDescription("");
                  setCreateTokens("1000");
                  setCreateDeadline("");
                  setCreateCategory("Technical");
                  setCreateStatus("OPEN");
                  setCreateOpen(false);
                  await refresh();
                  setSuccessMessage("Feature created successfully!");
                } catch (e) {
                  const message = e instanceof Error ? e.message : String(e);
                  setError(message);
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
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-destructive">{error}</div>
          <button
            onClick={() => setError(null)}
            className="text-destructive/60 hover:text-destructive transition-colors"
            aria-label="Dismiss error"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-md border border-green-600/40 bg-green-600/10 p-3 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-green-600">{successMessage}</div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600/60 hover:text-green-600 transition-colors"
            aria-label="Dismiss success message"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      ) : null}

      <div className="space-y-3">
        {loading ? (
          <Card className="border border-border/60 bg-card/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />
            <div className="p-8 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-mono">Loading features…</p>
            </div>
          </Card>
        ) : filteredFeatures.length === 0 ? (
          <Card className="border border-border/60 bg-card/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />
            <EmptyState
              variant="features"
              title={
                searchQuery || statusFilter !== "ALL"
                  ? "No features match your filters"
                  : "No features found"
              }
              description={
                searchQuery || statusFilter !== "ALL"
                  ? "Try adjusting your search or filters to find what you're looking for."
                  : isAdmin
                    ? "Create your first feature to begin accepting contributions."
                    : "Check back later for new contribution opportunities."
              }
              action={
                searchQuery || statusFilter !== "ALL" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("ALL");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : isAdmin ? (
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create first feature
                  </Button>
                ) : null
              }
            />
          </Card>
        ) : null}

        {filteredFeatures.map((f) => (
          <FeatureCard key={f.id} feature={f} />
        ))}
      </div>
    </div>
  );
}
