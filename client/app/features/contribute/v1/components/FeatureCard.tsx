import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import type { Feature } from "../api/types";

interface FeatureCardProps {
  feature: Feature;
}

export function FeatureCard({ feature }: FeatureCardProps) {
  const statusIcon =
    feature.status === "COMPLETED" ? (
      <CheckCircle2 className="w-3 h-3" />
    ) : feature.status === "IN_PROGRESS" ? (
      <Clock className="w-3 h-3" />
    ) : feature.status === "CANCELLED" ? (
      <XCircle className="w-3 h-3" />
    ) : null;

  const statusVariant =
    feature.status === "COMPLETED"
      ? ("default" as const)
      : feature.status === "IN_PROGRESS"
        ? ("secondary" as const)
        : feature.status === "CANCELLED"
          ? ("destructive" as const)
          : ("outline" as const);

  return (
    <Link
      href={`/contribute/features/${feature.id}`}
      className="block"
      style={{ textDecoration: "none" }}
    >
      <Card className="p-4 border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden group cursor-pointer">
        {/* Scan line effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between relative">
          <div className="space-y-2 flex-1">
            <h3 className="text-base md:text-lg font-mono font-semibold hover:text-primary transition-colors group-hover:text-primary">
              <span className="text-primary">{">"}</span> {feature.name}
            </h3>
            {feature.description && (
              <p className="text-xs text-muted-foreground/90 font-mono line-clamp-2">
                {feature.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusVariant} className="gap-1">
                {statusIcon}
                {feature.status}
              </Badge>
              <Badge variant="secondary">{feature.category}</Badge>
              <Badge variant="default">
                {formatNumber(feature.total_tokens_reward)} CFT
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Created {formatTime(feature.created_date)}
              {feature.deadline
                ? ` · Deadline ${formatTime(feature.deadline)}`
                : ""}
            </p>
          </div>
        </div>
      </Card>
    </Link>
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
