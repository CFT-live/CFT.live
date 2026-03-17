import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { Feature } from "../api/types";

type FeatureHeaderProps = {
  feature: Feature | null;
  tasksDone: number;
  tasksTotal: number;
  allTasksDone: boolean;
  isAdmin: boolean;
  loading: boolean;
  deletingFeature: boolean;
  onMarkComplete: () => void;
  onDeleteFeature: () => void;
  onRefresh: () => void;
};

export function FeatureHeader({
  feature,
  tasksDone,
  tasksTotal,
  allTasksDone,
  isAdmin,
  loading,
  deletingFeature,
  onMarkComplete,
  onDeleteFeature,
  onRefresh,
}: Readonly<FeatureHeaderProps>) {
  const statusBadge = feature ? getFeatureStatusBadge(feature.status) : null;
  const canMarkComplete =
    isAdmin &&
    allTasksDone &&
    feature !== null &&
    (feature.status === "OPEN" || feature.status === "IN_PROGRESS");
  const canDelete = isAdmin && feature !== null && feature.status !== "COMPLETED";

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-wider uppercase">
          <span className="text-muted-foreground">{">"}</span>
          {feature?.name ?? "FEATURE"}
        </h1>
        {feature ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge
              variant={statusBadge?.variant ?? "outline"}
              className="gap-1"
            >
              {statusBadge?.icon}
              {feature.status}
            </Badge>
            <Badge variant="secondary">{feature.category}</Badge>
            <Tooltip content="Total token reward pool for this feature">
              <Badge
                variant="default"
                className="bg-primary/10 text-primary border-primary/30"
              >
                {formatNumber(feature.total_tokens_reward)} CFT
              </Badge>
            </Tooltip>
            <Tooltip
              content={`${tasksDone} completed out of ${tasksTotal} total tasks`}
            >
              <Badge variant="outline">
                Tasks: {tasksDone}/{tasksTotal}
              </Badge>
            </Tooltip>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {canMarkComplete ? (
          <Button onClick={onMarkComplete} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Completing…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Mark Complete
              </>
            )}
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            variant="destructive"
            onClick={onDeleteFeature}
            disabled={loading || deletingFeature}
          >
            {deletingFeature ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete Feature
              </>
            )}
          </Button>
        ) : null}
        <Button variant="outline" onClick={onRefresh} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading
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
  );
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

function getFeatureStatusBadge(status: Feature["status"]): {
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: React.ReactNode;
} {
  switch (status) {
    case "COMPLETED":
      return {
        variant: "default",
        icon: <CheckCircle2 className="w-3 h-3" />,
      };
    case "IN_PROGRESS":
      return {
        variant: "secondary",
        icon: <Clock className="w-3 h-3" />,
      };
    case "CANCELLED":
      return {
        variant: "destructive",
        icon: <XCircle className="w-3 h-3" />,
      };
    default:
      return {
        variant: "outline",
        icon: null,
      };
  }
}
