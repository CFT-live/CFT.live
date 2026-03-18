import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { User } from "lucide-react";
import type { Task } from "./api/types";
import type { ReactNode } from "react";

interface TaskCardProps {
  task: Task;
  featureId: string;
  statusIcon: ReactNode;
  statusVariant: "default" | "secondary" | "destructive" | "outline";
}

function formatClaimDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "";
  }
}

export function TaskCard({
  task,
  featureId,
  statusIcon,
  statusVariant,
}: TaskCardProps) {
  const isClaimed = !!task.claimed_by_id;
  const claimedById = task.claimed_by_id;
  const cardBorderClass = isClaimed
    ? "border-primary/20 bg-primary/5"
    : "border-border/60 bg-card/80";

  return (
    <Link
      href={`/contribute/features/${featureId}/tasks/${task.id}`}
      className="block"
      style={{ textDecoration: "none" }}
    >
      <Card
        className={`p-4 ${cardBorderClass} backdrop-blur-sm hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden group cursor-pointer`}
      >
        {/* Scan line effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between relative">
          <div className="space-y-2 flex-1">
            <h3 className="font-mono font-semibold hover:text-primary group-hover:text-primary transition-colors">
              <span className="text-primary text-xs">{">"}</span> {task.name}
            </h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusVariant} className="gap-1">
                {statusIcon}
                {task.status}
              </Badge>
              <Badge variant="secondary">{task.task_type}</Badge>
              {claimedById && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <User className="w-3 h-3" />
                  {claimedById.slice(0, 6)}…{claimedById.slice(-4)}
                  {task.claimed_date && (
                    <span className="text-xs text-muted-foreground ml-1">
                      · {formatClaimDate(task.claimed_date)}
                    </span>
                  )}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
