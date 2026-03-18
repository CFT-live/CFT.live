import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmptyStateProps {
  title: string;
  message: string;
  iconColor?: string;
}

export function EmptyState({
  title,
  message,
  iconColor = "text-primary",
}: EmptyStateProps) {
  return (
    <Alert className="border-primary bg-accent">
      <svg
        className={`w-4 h-4 ${iconColor}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
      <AlertDescription>
        <strong className="font-semibold">{title}</strong>
        <p className="mt-1">{message}</p>
      </AlertDescription>
    </Alert>
  );
}
