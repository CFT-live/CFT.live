import { Badge } from "@/components/ui/badge";
import type { Feature } from "../api/types";
import { FeatureCard } from "./FeatureCard";
import { TerminalSection } from "./TerminalSection";

interface CategorySectionProps {
  title: string;
  features: Feature[];
}

export function CategorySection({ title, features }: Readonly<CategorySectionProps>) {
  if (features.length === 0) return null;

  return (
    <TerminalSection
      title={title}
      headerAction={
        <Badge variant="outline" className="font-mono text-xs">
          {features.length}
        </Badge>
      }
    >
      <div className="space-y-3">
        {features.map((f) => (
          <FeatureCard key={f.id} feature={f} showStatus />
        ))}
      </div>
    </TerminalSection>
  );
}
