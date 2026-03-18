"use client";

import { usePathname } from "next/navigation";
import { Link } from "@/i18n/routing";
import { ChevronRight } from "lucide-react";

// Helper to check if a string looks like a UUID
function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Helper to format segment labels
function formatLabel(segment: string): string {
  if (isUuid(segment)) {
    // Shorten UUIDs to first 8 characters
    return segment.slice(0, 8).toUpperCase();
  }
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Breadcrumb() {
  const pathname = usePathname();
  
  // Remove leading/trailing slashes and split path
  const pathSegments = pathname.split("/").filter(Boolean);
  
  // First segment is always the locale (e.g., 'en', 'de')
  const pathWithoutLocale = pathSegments.slice(1);
  
  // If we're on the home page, don't show breadcrumb
  if (pathWithoutLocale.length === 0) {
    return null;
  }
  
  // Build breadcrumb segments
  const breadcrumbs = [
    { label: "Home", href: "/" },
    ...pathWithoutLocale.map((segment, index) => {
      const href = `/${pathWithoutLocale.slice(0, index + 1).join("/")}`;
      const label = formatLabel(segment);
      return { label, href };
    }),
  ];
  
  return (
    <nav className="container mx-auto px-4 py-2 md:py-3">
      <ol className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-mono">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
          return (
            <li key={crumb.href} className="flex items-center gap-1.5 md:gap-2">
              {isLast ? (
                <span className="text-primary font-medium uppercase tracking-wider">
                  {crumb.label}
                </span>
              ) : (
                <>
                  <Link
                    href={crumb.href}
                    className="text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
                  >
                    {crumb.label}
                  </Link>
                  <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-border" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
