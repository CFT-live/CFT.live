import * as React from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  side?: "top" | "right" | "bottom" | "left";
}

export function Tooltip({ children, content, side = "top" }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  const sideClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            "absolute z-50 rounded-md border border-border bg-popover px-3 py-1.5 text-xs font-mono text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
            sideClasses[side]
          )}
        >
          {content}
          <div
            className={cn(
              "absolute w-2 h-2 bg-popover border-border rotate-45",
              side === "top" && "top-full left-1/2 -translate-x-1/2 -mt-1 border-r border-b",
              side === "right" && "right-full top-1/2 -translate-y-1/2 -mr-1 border-l border-b",
              side === "bottom" && "bottom-full left-1/2 -translate-x-1/2 -mb-1 border-l border-t",
              side === "left" && "left-full top-1/2 -translate-y-1/2 -ml-1 border-r border-t"
            )}
          />
        </div>
      )}
    </div>
  );
}
