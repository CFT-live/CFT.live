import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Info, AlertCircle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastProps {
  id?: string;
  type?: ToastType;
  title?: string;
  description?: string;
  duration?: number;
  onClose?: () => void;
}

const toastIcons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertCircle,
};

const toastStyles = {
  success: "border-green-500/40 bg-green-500/10 text-green-500",
  error: "border-destructive/40 bg-destructive/10 text-destructive",
  info: "border-blue-500/40 bg-blue-500/10 text-blue-500",
  warning: "border-yellow-500/40 bg-yellow-500/10 text-yellow-500",
};

export function Toast({ type = "info", title, description, onClose }: ToastProps) {
  const Icon = toastIcons[type];

  return (
    <div
      className={cn(
        "pointer-events-auto rounded-md border-2 p-4 shadow-lg backdrop-blur-sm relative overflow-hidden",
        toastStyles[type]
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_2px] opacity-10 pointer-events-none" />
      <div className="flex gap-3 relative">
        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          {title && <p className="text-sm font-mono font-semibold">{title}</p>}
          {description && <p className="text-xs font-mono opacity-90">{description}</p>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="shrink-0 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed bottom-0 right-0 z-50 flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] pointer-events-none">
      {children}
    </div>
  );
}
