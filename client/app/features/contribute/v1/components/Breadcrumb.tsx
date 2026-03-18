import { Fragment } from "react";
import { Link } from "@/i18n/routing";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-2 text-sm font-mono", className)}>
      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
          {item.href && !item.active ? (
            <Link
              href={item.href}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className={cn(item.active ? "text-primary font-semibold" : "text-muted-foreground")}>
              {item.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
