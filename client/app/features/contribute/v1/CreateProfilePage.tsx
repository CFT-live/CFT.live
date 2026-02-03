"use client";

import { useEffect, useState } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Wallet, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { upsertMyContributor } from "./api/api";
import { useContributorProfile } from "./hooks/useContributorProfile";

export default function CreateProfilePage() {
  const router = useRouter();
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const { hasProfile, contributor, ensureProfile } =
    useContributorProfile(address);

  const [username, setUsername] = useState("");
  const [github, setGithub] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Redirect to profile page if already has profile
  useEffect(() => {
    if (hasProfile && contributor) {
      router.push("/contribute/profile");
    }
  }, [hasProfile, contributor, router]);

  const handleCreateProfile = async () => {
    setError(null);

    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    setIsSaving(true);
    try {
      await upsertMyContributor({
        username: username.trim(),
        github_username: github.trim() || null,
      });

      // Clear cache to ensure fresh data
      try {
        sessionStorage.removeItem("cft_profile_cache");
      } catch {
        // ignore
      }

      // Force refresh the profile data
      await ensureProfile(true);

      // Navigate to profile page
      router.push("/contribute/profile");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Background grid effect */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.15)_1px,transparent_1px)] bg-size-[40px_40px] pointer-events-none -z-10 opacity-40" />

      <div>
        <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-wider uppercase">
          <span className="text-muted-foreground">{">"}</span> CREATE PROFILE
        </h1>
        <p className="text-sm text-muted-foreground">
          Create your contributor profile to claim tasks and submit
          contributions.
        </p>
      </div>

      {!isConnected ? (
        <Card className="p-4 border-2 border-primary/30 bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />
          <div className="flex items-center justify-between gap-2 relative">
            <div>
              <p className="text-sm font-mono flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                Wallet not connected
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                Connect your wallet to create a profile.
              </p>
            </div>
            <Button onClick={() => open()} variant="default" size="sm">
              Connect
            </Button>
          </div>
        </Card>
      ) : null}

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {isConnected && (
        <Card className="p-6 border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/20 transition-all relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />

          <div className="space-y-6 relative">
            {address && (
              <div className="text-xs text-muted-foreground font-mono">
                Connected: {address.slice(0, 6)}…{address.slice(-4)}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="font-mono uppercase text-xs">
                Username <span className="text-destructive">*</span>
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                className="font-mono"
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Choose a unique username for the contributor leaderboard.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="github" className="font-mono uppercase text-xs">
                GitHub Username
              </Label>
              <Input
                id="github"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="your_github"
                className="font-mono"
                disabled={isSaving}
              />
            </div>

            <Button
              onClick={handleCreateProfile}
              disabled={isSaving || !username.trim()}
              className="w-full"
              size="lg"
            >
              {isSaving ? (
                <>Creating profile...</>
              ) : (
                <>
                  Create profile
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
