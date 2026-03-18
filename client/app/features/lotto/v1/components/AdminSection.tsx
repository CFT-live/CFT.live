"use client";

import { AutoClearingAlert } from "../../../root/v1/components/AutoClearingAlert";

interface AdminSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
  errorMessage?: string;
}

export function AdminSection({
  title,
  description,
  errorMessage,
  children,
}: AdminSectionProps) {
  return (
    <div className="space-y-2 p-4 border rounded-lg">
      <h3 className="font-semibold text-sm uppercase tracking-wide">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
      {children}
      <AutoClearingAlert message={errorMessage} variant="destructive" />
    </div>
  );
}
