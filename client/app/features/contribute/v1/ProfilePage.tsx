"use client";

import { useEffect, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { upsertMyContributor } from "./api/api";
import { useContributorProfile } from "./hooks/useContributorProfile";
import { EditableTextField } from "./EditableField";

export default function ContributeProfilePage() {
  const router = useRouter();
  const { address, isConnected } = useAppKitAccount();
  const { hasProfile, contributor, ensureProfile } =
    useContributorProfile(address);

  const [username, setUsername] = useState("");
  const [github, setGithub] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const [editingUsername, setEditingUsername] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editingGithub, setEditingGithub] = useState(false);
  const [editGithub, setEditGithub] = useState("");
  const [savingField, setSavingField] = useState(false);

  // Redirect to create profile page if no profile exists
  useEffect(() => {
    if (hasProfile === false && isConnected) {
      router.push("/contribute/create-profile");
    }
  }, [hasProfile, isConnected, router]);

  useEffect(() => {
    if (contributor) {
      setUsername(contributor.username ?? "");
      setGithub(contributor.github_username ?? "");
      setEditUsername(contributor.username ?? "");
      setEditGithub(contributor.github_username ?? "");
    }
  }, [contributor]);

  return (
    <div className="space-y-6 relative">
      {/* Background grid effect */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.15)_1px,transparent_1px)] bg-size-[40px_40px] pointer-events-none -z-10 opacity-40" />

      <div>
        <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-wider uppercase">
          <span className="text-muted-foreground">{">"}</span> CONTRIBUTOR
          PROFILE
        </h1>
        <p className="text-sm text-muted-foreground">
          Update your contributor profile information.
        </p>
      </div>



      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {done ? (
        <div className="rounded-md border-2 border-primary/40 bg-primary/10 p-3 text-sm text-primary flex items-center gap-2 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="relative">{done}</span>
        </div>
      ) : null}

      {isConnected && contributor && (
        <Card className="p-4 border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/20 transition-all relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />
          <div className="flex justify-between">
            <h2 className="text-lg font-mono font-semibold uppercase tracking-wider mb-4 relative">
              <span>{">"}</span> Update profile
            </h2>

            {address ? (
              <p className="text-xs text-muted-foreground font-mono mb-4">
                Connected: {address.slice(0, 6)}…{address.slice(-4)}
              </p>
            ) : null}
          </div>

          {/* Username Field */}
          <EditableTextField
            title="Username"
            value={editUsername}
            isEditable={isConnected && Boolean(address)}
            isEditing={editingUsername}
            isSaving={savingField}
            onEdit={() => {
              setEditUsername(username);
              setEditingUsername(true);
            }}
            onCancel={() => setEditingUsername(false)}
            onChange={setEditUsername}
            onSave={async () => {
              setError(null);
              setDone(null);
              if (!address) {
                setError("Please connect your wallet first");
                return;
              }

              if (!editUsername.trim()) {
                setError("Username is required");
                return;
              }

              setSavingField(true);
              try {
                await upsertMyContributor({
                  username: editUsername.trim(),
                  github_username: github.trim() || null,
                });
                try {
                  sessionStorage.removeItem("cft_profile_cache");
                } catch {
                  // ignore
                }
                await ensureProfile(true);
                setUsername(editUsername);
                setEditingUsername(false);
                setDone("Username updated.");
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              } finally {
                setSavingField(false);
              }
            }}
            placeholder="your_username"
          />

          {/* GitHub Username Field */}
          <EditableTextField
            title="GitHub Username"
            value={editGithub}
            isEditable={isConnected && Boolean(address)}
            isEditing={editingGithub}
            isSaving={savingField}
            onEdit={() => {
              setEditGithub(github);
              setEditingGithub(true);
            }}
            onCancel={() => setEditingGithub(false)}
            onChange={setEditGithub}
            onSave={async () => {
              setError(null);
              setDone(null);
              if (!address) {
                setError("Please connect your wallet first");
                return;
              }

              setSavingField(true);
              try {
                await upsertMyContributor({
                  username: username.trim(),
                  github_username: editGithub.trim() || null,
                });
                try {
                  sessionStorage.removeItem("cft_profile_cache");
                } catch {
                  // ignore
                }
                await ensureProfile(true);
                setGithub(editGithub);
                setEditingGithub(false);
                setDone("GitHub username updated.");
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              } finally {
                setSavingField(false);
              }
            }}
            placeholder="your_github"
            className=""
          />
        </Card>
      )}
    </div>
  );
}
