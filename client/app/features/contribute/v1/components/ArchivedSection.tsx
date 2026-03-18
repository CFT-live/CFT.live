import { Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Feature } from "../api/types";
import { FeatureCard } from "./FeatureCard";
import { TerminalSection } from "./TerminalSection";

interface ArchivedSectionProps {
  features: Feature[];
}

export function ArchivedSection({ features }: Readonly<ArchivedSectionProps>) {
  if (features.length === 0) return null;

  return (
    <TerminalSection
      title="Archived"
      className="opacity-75 hover:opacity-100 transition-opacity"
      headerAction={
        <div className="flex items-center gap-2">
          <Archive className="w-3.5 h-3.5 text-muted-foreground" />
          <Badge variant="outline" className="font-mono text-xs">
            {features.length}
          </Badge>
        </div>
      }
    >
      <p className="text-xs text-muted-foreground font-mono mb-3">
        Completed and cancelled features.
      </p>
      <div className="space-y-3">
        {features.map((f) => (
          <FeatureCard key={f.id} feature={f} showStatus />
        ))}
      </div>
    </TerminalSection>
  );
}
