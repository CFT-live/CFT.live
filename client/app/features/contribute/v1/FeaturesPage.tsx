"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X as XIcon,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";

import { listFeatures } from "./api/api";
import type { Feature } from "./api/types";
import { ACTIVE_STATUSES, ARCHIVED_STATUSES, CATEGORY_OPTIONS } from "./constants";
import { useContributorProfile } from "./hooks/useContributorProfile";
import { EmptyState } from "./components/EmptyState";
import { CategorySection } from "./components/CategorySection";
import { ArchivedSection } from "./components/ArchivedSection";

export default function FeaturesPage() {
  const { address } = useAppKitAccount();
  const { isAdmin } = useContributorProfile(address);

  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Apply search filter then split into active vs archived
  const { activeByCategory, archivedFeatures, totalActive, totalArchived } =
    useMemo(() => {
      let filtered = features;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (f) =>
            f.name.toLowerCase().includes(query) ||
            f.description.toLowerCase().includes(query) ||
            f.category.toLowerCase().includes(query),
        );
      }

      // Sort by newest first within each group
      const sorted = filtered
        .slice()
        .sort((a, b) => (a.created_date < b.created_date ? 1 : -1));

      const active = sorted.filter((f) =>
        ACTIVE_STATUSES.includes(f.status),
      );
      const archived = sorted.filter((f) =>
        ARCHIVED_STATUSES.includes(f.status),
      );

      // Group active features by category, preserving CATEGORY_OPTIONS order
      const byCategory = new Map<string, Feature[]>();
      for (const cat of CATEGORY_OPTIONS) {
        const catFeatures = active.filter((f) => f.category === cat);
        if (catFeatures.length > 0) {
          byCategory.set(cat, catFeatures);
        }
      }
      // Catch any features with categories not in CATEGORY_OPTIONS
      const knownCats = new Set(CATEGORY_OPTIONS);
      const uncategorized = active.filter((f) => !knownCats.has(f.category));
      if (uncategorized.length > 0) {
        byCategory.set("Other", uncategorized);
      }

      return {
        activeByCategory: byCategory,
        archivedFeatures: archived,
        totalActive: active.length,
        totalArchived: archived.length,
      };
    }, [features, searchQuery]);

  const activeCategoryCount = activeByCategory.size;
  const hasResults = totalActive > 0 || totalArchived > 0;

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
            Pick a feature below and start contributing to earn CFT tokens.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link href="/contribute/features/create">
              <Button variant="outline">
                <Plus className="w-4 h-4" />
                New feature
              </Button>
            </Link>
          )}

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

      {/* Search */}
      <Card className="p-4 border border-border/60 bg-card/80 backdrop-blur-sm">
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
        {searchQuery && (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>
              Showing {totalActive + totalArchived} of {features.length} feature
              {features.length === 1 ? "" : "s"}
              {totalActive > 0 &&
                ` · ${totalActive} active across ${activeCategoryCount} ${activeCategoryCount === 1 ? "category" : "categories"}`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="h-auto py-1"
            >
              Clear search
            </Button>
          </div>
        )}
      </Card>

      {/* Error banner */}
      {error && (
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
      )}

      {/* Success banner */}
      {successMessage && (
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
      )}

      {/* Loading state */}
      {loading && (
        <Card className="border border-border/60 bg-card/60 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />
          <div className="p-8 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-mono">
              Loading features…
            </p>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !hasResults && (
        <Card className="border border-border/60 bg-card/60 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />
          <EmptyState
            variant="features"
            title={
              searchQuery
                ? "No features match your search"
                : "No features found"
            }
            description={
              searchQuery
                ? "Try adjusting your search to find what you're looking for."
                : isAdmin
                  ? "Create your first feature to begin accepting contributions."
                  : "Check back later for new contribution opportunities."
            }
            action={
              searchQuery ? (
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              ) : isAdmin ? (
                <Link href="/contribute/features/create">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create first feature
                  </Button>
                </Link>
              ) : null
            }
          />
        </Card>
      )}

      {/* Active feature sections grouped by category */}
      {!loading && (
        <div className="space-y-6">
          {Array.from(activeByCategory.entries()).map(
            ([category, catFeatures]) => (
              <CategorySection
                key={category}
                title={category}
                features={catFeatures}
              />
            ),
          )}

          {/* Archived section (completed / cancelled) */}
          <ArchivedSection features={archivedFeatures} />
        </div>
      )}
    </div>
  );
}
