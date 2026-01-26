"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";

interface ErrorStateProps {
  title: string;
  message: string;
  details?: string;
}

export function ErrorStateLotto({ title, message, details }: ErrorStateProps) {
  return (
    <Alert variant="destructive">
      <AlertDescription>
        <div className="space-y-2">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm">{message}</p>
          {details && (
            <p className="text-xs font-mono bg-destructive/10 p-2 rounded">
              {details}
            </p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
