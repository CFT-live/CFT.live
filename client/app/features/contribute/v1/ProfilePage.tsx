"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { upsertMyContributor } from "./api/api";
import { useContributorProfile } from "./hooks/useContributorProfile";

export default function ContributeProfilePage() {
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const { hasProfile, contributor, isLoading, ensureProfile } = useContributorProfile(address);

  const [username, setUsername] = useState("");
  const [github, setGithub] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (address) void ensureProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  useEffect(() => {
    if (contributor) {
      setUsername(contributor.username ?? "");
      setGithub(contributor.github_username ?? "");
    }
  }, [contributor]);

  const canSave = useMemo(() => {
    return Boolean(isConnected && address && username.trim().length > 0);
  }, [address, isConnected, username]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-wider">Contributor profile</h1>
        <p className="text-sm text-muted-foreground">
          Create your profile once to claim tasks and submit contributions.
        </p>
      </div>

      {!isConnected ? (
        <Card className="p-4 border border-border/60 bg-background/60">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-mono">Wallet not connected</p>
              <p className="text-xs text-muted-foreground font-mono">Connect to create/update your profile.</p>
            </div>
            <Button variant="outline" onClick={() => open()}>
              Connect wallet
            </Button>
          </div>
        </Card>
      ) : null}

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {done ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {done}
        </div>
      ) : null}

      <Card className="p-4 border border-border/60 bg-background/60">
        <h2 className="text-sm font-mono font-semibold uppercase tracking-wider">
          {hasProfile ? "Update profile" : "Create profile"}
        </h2>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Username</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="yourname" />
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">GitHub username</label>
            <Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="octocat" />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button
            disabled={!canSave || saving || isLoading}
            onClick={async () => {
              setError(null);
              setDone(null);
              if (!address) return;

              setSaving(true);
              try {
                await upsertMyContributor({
                  username: username.trim(),
                  github_username: github.trim() || null,
                });
                try {
                  sessionStorage.removeItem("cft_profile_cache");
                } catch {
                  // ignore
                }
                await ensureProfile(true);
                setDone("Saved.");
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
          {address ? (
            <span className="text-xs text-muted-foreground font-mono">
              Connected: {address.slice(0, 6)}…{address.slice(-4)}
            </span>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
