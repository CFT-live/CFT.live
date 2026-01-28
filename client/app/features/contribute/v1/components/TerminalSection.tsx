import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ScanLineEffect } from "./ScanLineEffect";
import { cn } from "@/lib/utils";

interface TerminalSectionProps {
  title: string;
  children: ReactNode;
  headerAction?: ReactNode;
  highlight?: boolean;
  className?: string;
}

export function TerminalSection({
  title,
  children,
  headerAction,
  highlight = false,
  className,
}: TerminalSectionProps) {
  return (
    <Card
      className={cn(
        "p-4 border bg-card/80 backdrop-blur-sm hover:border-primary/20 transition-all relative overflow-hidden",
        highlight && "border-2 border-primary/30 shadow-lg shadow-primary/5",
        className
      )}
    >
      <ScanLineEffect />
      <div className="relative">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider">
            <span className="text-primary">{">"}[</span> {title}{" "}
            <span className="text-primary">]</span>
          </h2>
          {headerAction && <div>{headerAction}</div>}
        </div>
        {children}
      </div>
    </Card>
  );
}
