"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Loader2, Save, CheckCircle2, Wallet } from "lucide-react";

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
    <div className="space-y-6 relative">
      {/* Background grid effect */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.15)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none -z-10 opacity-40" />
      
      <div>
        <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-wider uppercase">
          <span className="text-muted-foreground">{">"}</span> CONTRIBUTOR PROFILE
        </h1>
        <p className="text-sm text-muted-foreground">
          Create your profile once to claim tasks and submit contributions.
        </p>
      </div>

      {!isConnected ? (
        <Card className="p-4 border-2 border-primary/30 bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_2px] opacity-10 pointer-events-none" />
          <div className="flex items-center justify-between gap-2 relative">
            <div>
              <p className="text-sm font-mono flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-primary">{">"}[</span> Wallet not connected
              </p>
              <p className="text-xs text-muted-foreground font-mono">Connect to create/update your profile.</p>
            </div>
            <Button variant="default" onClick={() => open()}>
              <Wallet className="w-4 h-4" />
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
        <div className="rounded-md border-2 border-primary/40 bg-primary/10 p-3 text-sm text-primary flex items-center gap-2 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_2px] opacity-10 pointer-events-none" />
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="relative">{done}</span>
        </div>
      ) : null}

      <Card className="p-4 border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/20 transition-all relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_2px] opacity-10 pointer-events-none" />
        <h2 className="text-sm font-mono font-semibold uppercase tracking-wider relative">
            <span className="text-primary">{">"}[</span> {hasProfile ? "Update profile" : "Create profile"} <span className="text-primary">]</span>
        </h2>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-mono text-muted-foreground">Username</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your_username" />
          </div>
          <div>
            <label className="text-xs font-mono text-muted-foreground">GitHub username</label>
            <Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="your_github" />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 relative">
          <Button
            variant={canSave && !saving && !isLoading ? "default" : "outline"}
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
            {saving || isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save
              </>
            )}
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
