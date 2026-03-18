import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins } from "lucide-react";
import type { Contribution, Feature } from "../api/types";

type PublicContributor = {
  id: string;
  wallet_address: string;
  username: string;
  github_username: string | null;
  telegram_handle: string | null;
  roles: string[];
  status: string;
};

type DistributionPreviewSectionProps = Readonly<{
  feature: Feature | null;
  contributions: Contribution[];
  contributorsById: Record<string, PublicContributor>;
  totalCpAwarded: number;
}>;

type ContributorShare = {
  contributorId: string;
  cp: number;
  percentage: number;
  tokens: number;
};

export function DistributionPreviewSection({
  feature,
  contributions,
  contributorsById,
  totalCpAwarded,
}: DistributionPreviewSectionProps) {
  const shares = useMemo<ContributorShare[]>(() => {
    if (!feature || totalCpAwarded === 0) return [];

    const cpByContributor = new Map<string, number>();
    for (const c of contributions) {
      if (
        c.status === "APPROVED" &&
        c.cp_awarded !== null &&
        c.cp_awarded > 0
      ) {
        const prev = cpByContributor.get(c.contributor_id) ?? 0;
        cpByContributor.set(c.contributor_id, prev + c.cp_awarded);
      }
    }

    return Array.from(cpByContributor.entries())
      .map(([contributorId, cp]) => {
        const percentage = cp / totalCpAwarded;
        const tokens = percentage * feature.total_tokens_reward;
        return { contributorId, cp, percentage, tokens };
      })
      .sort((a, b) => b.cp - a.cp);
  }, [contributions, feature, totalCpAwarded]);

  if (!feature || totalCpAwarded === 0) return null;

  return (
    <Card className="p-4 border border-border/60 bg-background/60">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-mono font-semibold uppercase tracking-wider">
          <span>{">"}</span> Distribution Preview
        </h2>
        <Badge variant="outline" className="gap-1">
          <Coins className="w-3 h-3" />
          {feature.total_tokens_reward.toLocaleString()} CFT pool
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground font-mono">
        Estimated token distribution based on approved CP. Updates as
        contributions are reviewed.
      </p>

      <div className="mt-4 space-y-1">
        {/* Header */}
        <div className="grid grid-cols-[1fr_80px_80px_100px] gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground px-3 pb-1 border-b border-border/40">
          <span>Contributor</span>
          <span className="text-right">CP</span>
          <span className="text-right">Share</span>
          <span className="text-right">Tokens</span>
        </div>

        {shares.map((s) => {
          const name =
            contributorsById[s.contributorId]?.username ??
            `${s.contributorId.slice(0, 6)}…${s.contributorId.slice(-4)}`;

          return (
            <div
              key={s.contributorId}
              className="grid grid-cols-[1fr_80px_80px_100px] gap-2 items-center rounded-md px-3 py-2 text-sm font-mono hover:bg-card/80 transition-colors group"
            >
              {/* Contributor name */}
              <span className="truncate" title={s.contributorId}>
                {name}
              </span>

              {/* CP column */}
              <span className="text-right tabular-nums">{s.cp}</span>

              {/* Percentage column */}
              <span className="text-right tabular-nums text-muted-foreground">
                {(s.percentage * 100).toFixed(1)}%
              </span>

              {/* Tokens column */}
              <span className="text-right tabular-nums font-semibold text-primary">
                {s.tokens % 1 === 0
                  ? s.tokens.toLocaleString()
                  : s.tokens.toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{" "}
                CFT
              </span>
            </div>
          );
        })}

        {/* Totals row */}
        <div className="grid grid-cols-[1fr_80px_80px_100px] gap-2 items-center rounded-md px-3 py-2 text-sm font-mono border-t border-border/40 mt-1">
          <span className="text-muted-foreground uppercase text-xs tracking-wider">
            Total
          </span>
          <span className="text-right tabular-nums font-semibold">
            {totalCpAwarded}
          </span>
          <span className="text-right tabular-nums text-muted-foreground">
            100%
          </span>
          <span className="text-right tabular-nums font-semibold text-primary">
            {feature.total_tokens_reward.toLocaleString()} CFT
          </span>
        </div>
      </div>
    </Card>
  );
}
