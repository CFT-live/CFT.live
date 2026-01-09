"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface AutoClearingAlertProps {
  message: string | null | undefined;
  variant?: "default" | "destructive";
  icon?: React.ReactNode;
  duration?: number;
  className?: string;
  onClear?: () => void;
}

export const AutoClearingAlert: React.FC<AutoClearingAlertProps> = ({
  message,
  variant = "default",
  icon,
  duration = 15000,
  className,
  onClear,
}) => {
  const [visible, setVisible] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      setCurrentMessage(message);
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
        onClear?.();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setVisible(false);
      setCurrentMessage(null);
    }
  }, [message, duration, onClear]);

  if (!visible || !currentMessage) {
    return null;
  }

  const handleDismiss = () => {
    setVisible(false);
    onClear?.();
  };

  return (
    <Alert
      variant={variant}
      className={cn("relative animate-in fade-in slide-in-from-top-2", className)}
    >
      {icon}
      <AlertDescription className="text-xs sm:text-sm pr-6">
        {currentMessage}
      </AlertDescription>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss alert"
      >
        <X className="h-3 w-3" />
      </button>
    </Alert>
  );
};