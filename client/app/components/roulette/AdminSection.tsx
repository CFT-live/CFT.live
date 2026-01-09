"use client";

import { AutoClearingAlert } from "../AutoClearingAlert";

interface AdminSectionProps {
  readonly title: string;
  readonly description: string;
  readonly children: React.ReactNode;
  readonly errorMessage?: string;
}

export function AdminSection({
  title,
  description,
  errorMessage,
  children,
}: Readonly<AdminSectionProps>) {
  return (
    <div className="space-y-2 p-4 border rounded-lg">
      <h3 className="font-semibold text-sm uppercase tracking-wide">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground">{description}</p>
      {children}
      <AutoClearingAlert
        message={errorMessage}
        variant="destructive"
      />
    </div>
  );
}
