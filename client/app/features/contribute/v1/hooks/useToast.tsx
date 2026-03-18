import { useState, useCallback } from "react";
import type { ToastProps } from "@/components/ui/toast";

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const toast = useCallback(
    ({ type = "info", title, description, duration = 5000 }: Omit<ToastProps, "id" | "onClose">) => {
      const id = Math.random().toString(36).substring(7);
      
      setToasts((prev) => [...prev, { id, type, title, description }]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }

      return id;
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    toast,
    dismiss,
    dismissAll,
    success: (title: string, description?: string) => toast({ type: "success", title, description }),
    error: (title: string, description?: string) => toast({ type: "error", title, description }),
    info: (title: string, description?: string) => toast({ type: "info", title, description }),
    warning: (title: string, description?: string) => toast({ type: "warning", title, description }),
  };
}
