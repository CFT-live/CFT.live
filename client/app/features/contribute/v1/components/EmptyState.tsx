import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Database, FileX, FolderX, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  variant?: "default" | "features" | "tasks" | "contributions" | "distributions";
}

const variantIcons = {
  default: "[ ]",
  features: <FolderX className="w-12 h-12" />,
  tasks: <FileX className="w-12 h-12" />,
  contributions: <Inbox className="w-12 h-12" />,
  distributions: <Database className="w-12 h-12" />,
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = "default",
}: EmptyStateProps) {
  const displayIcon = icon ?? variantIcons[variant];
  
  return (
    <div
      className={cn(
        "text-center py-10 px-6 space-y-4 relative",
        className
      )}
    >
      <div className="flex justify-center text-muted-foreground/40">
        {typeof displayIcon === "string" ? (
          <div className="text-5xl font-mono">{displayIcon}</div>
        ) : (
          displayIcon
        )}
      </div>
      <div className="space-y-2">
        <p className="text-base font-mono font-semibold text-muted-foreground">
          <span className="text-primary">{">"}</span> {title}
        </p>
        {description && (
          <p className="text-sm text-muted-foreground/80 max-w-md mx-auto">
            {description}
          </p>
        )}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
