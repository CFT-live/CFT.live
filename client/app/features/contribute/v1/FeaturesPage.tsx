"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  Loader2,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Filter,
  SortAsc,
  X as XIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
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

export default function FeaturesPage() {
  const { address } = useAppKitAccount();
  const { isAdmin } = useContributorProfile(address);

  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_2px] opacity-10 pointer-events-none" />
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
                    deadline: createDeadline.trim()
                      ? createDeadline.trim()
                      : null,
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
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        {filteredFeatures.length === 0 ? (
          <Card className="border border-border/60 bg-card/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_2px] opacity-10 pointer-events-none" />
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

        {filteredFeatures.map((f) => {
          const statusIcon =
            f.status === "COMPLETED" ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : f.status === "IN_PROGRESS" ? (
              <Clock className="w-3 h-3" />
            ) : f.status === "CANCELLED" ? (
              <XCircle className="w-3 h-3" />
            ) : null;
          const statusVariant =
            f.status === "COMPLETED"
              ? ("default" as const)
              : f.status === "IN_PROGRESS"
                ? ("secondary" as const)
                : f.status === "CANCELLED"
                  ? ("destructive" as const)
                  : ("outline" as const);

          return (
            <Card
              key={f.id}
              className="p-4 border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden group"
            >
              {/* Scan line effect */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_2px] opacity-10 pointer-events-none" />
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between relative">
                <div className="space-y-2 flex-1">
                  <Link
                    href={`/contribute/features/${f.id}`}
                    className="text-base md:text-lg font-mono font-semibold hover:text-primary transition-colors group-hover:text-primary block"
                    style={{ textDecoration: "none" }}
                  >
                    <span className="text-primary">{">"}</span> {f.name}
                  </Link>
                  {f.description && (
                    <p className="text-xs text-muted-foreground/90 font-mono line-clamp-2">
                      {f.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={statusVariant} className="gap-1">
                      {statusIcon}
                      {f.status}
                    </Badge>
                    <Badge variant="secondary">{f.category}</Badge>
                    <Badge
                      variant="default"
                      className="bg-primary/10 text-primary border-primary/30"
                    >
                      {formatNumber(f.total_tokens_reward)} CFT
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    Created {formatTime(f.created_date)}
                    {f.deadline ? ` · Deadline ${formatTime(f.deadline)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/contribute/features/${f.id}`}>
                    View Details
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
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
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 6,
    }).format(n);
  } catch {
    return String(n);
  }
}
