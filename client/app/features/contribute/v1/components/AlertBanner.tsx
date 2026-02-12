import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

type AlertBannerProps = {
  type: "error" | "success";
  message: string;
  onDismiss: () => void;
};

export function AlertBanner({ type, message, onDismiss }: AlertBannerProps) {
  const isError = type === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;
  const colorClass = isError ? "destructive" : "primary";

  return (
    <div
      className={`rounded-md border border-${colorClass}/50 bg-${colorClass}/10 p-4`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 text-${colorClass} mt-0.5`} />
        <div className="flex-1">
          {isError && (
            <h3 className={`text-sm font-mono font-semibold text-${colorClass} mb-1`}>
              Error
            </h3>
          )}
          <p className={`text-sm font-mono text-${colorClass}${isError ? "/90" : ""}`}>
            {message}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className={`text-${colorClass}/70 hover:text-${colorClass} transition-colors`}
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
