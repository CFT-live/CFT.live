import { cn } from "@/lib/utils";

interface ScanLineEffectProps {
  className?: string;
  opacity?: number;
}

export function ScanLineEffect({ className, opacity = 10 }: ScanLineEffectProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_2px] pointer-events-none",
        className
      )}
      style={{ opacity: opacity / 100 }}
    />
  );
}
