"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  X as XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createFeature } from "./api/api";
import type { FeatureStatus } from "./api/types";
import { useContributorProfile } from "./hooks/useContributorProfile";
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from "./constants";
import { TerminalSection } from "./components/TerminalSection";

export default function CreateFeaturePage() {
  const router = useRouter();
  const { address } = useAppKitAccount();
  const { isAdmin } = useContributorProfile(address);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Technical");
  const [description, setDescription] = useState("");
  const [tokens, setTokens] = useState("1000");
  const [status, setStatus] = useState<FeatureStatus>("OPEN");
  const [discussionLink, setDiscussionLink] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canCreate = useMemo(() => {
    return (
      isAdmin &&
      name.trim().length > 0 &&
      category.trim().length > 0 &&
      Number.isFinite(Number(tokens))
    );
  }, [category, name, tokens, isAdmin]);

  async function handleCreate() {
    setError(null);
    setSubmitting(true);
    try {
      const tokenAmount = Number(tokens);
      if (!Number.isFinite(tokenAmount) || tokenAmount < 0) {
        setError("Total CFT reward must be a non-negative number");
        setSubmitting(false);
        return;
      }

      const result = await createFeature({
        name: name.trim(),
        category: category.trim(),
        description,
        total_tokens_reward: tokenAmount,
        status,
        discussions_url: discussionLink.trim() || undefined,
      });

      // Cache the newly created feature for instant loading
      try {
        sessionStorage.setItem(
          `feature_cache_${result.feature.id}`,
          JSON.stringify(result.feature),
        );
      } catch {
        // Ignore cache errors
      }

      setSuccess(true);
      // Navigate back to features list after a brief delay
      setTimeout(() => router.push("/contribute/features"), 1200);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <TerminalSection title="Access Denied">
          <p className="text-sm text-muted-foreground font-mono">
            Only admins can create features.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/contribute/features")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to features
          </Button>
        </TerminalSection>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-wider uppercase">
            <span className="text-muted-foreground">{">"}</span> Create Feature
          </h1>
          <p className="text-sm text-muted-foreground">
            Define a new feature for contributors to work on.
          </p>
        </div>
      </div>

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

      {success && (
        <div className="rounded-md border border-green-600/40 bg-green-600/10 p-3 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-green-600">
            Feature created! Redirecting…
          </div>
        </div>
      )}

      <TerminalSection title="Feature Details" highlight>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs font-mono text-muted-foreground">
              Name
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          </div>
          <div>
            <span className="text-xs font-mono text-muted-foreground">
              Category
            </span>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-mono text-muted-foreground">
              Total CFT reward
              <Input
                value={tokens}
                onChange={(e) => setTokens(e.target.value)}
                inputMode="decimal"
              />
            </label>
          </div>
          <div>
            <span className="text-xs font-mono text-muted-foreground">
              Status
            </span>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as FeatureStatus)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-mono text-muted-foreground">
              Description
              {/* eslint-disable-next-line react/self-closing-comp */}
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[140px] rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              ></textarea>
            </label>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-mono text-muted-foreground">
              GitHub Discussion Link (optional)
              <Input
                value={discussionLink}
                onChange={(e) => setDiscussionLink(e.target.value)}
                placeholder="https://github.com/org/repo/discussions/123"
                type="url"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            disabled={!canCreate || submitting}
            onClick={handleCreate}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create Feature"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/contribute/features")}
            disabled={submitting}
          >
            Cancel
          </Button>
        </div>
      </TerminalSection>
    </div>
  );
}
