"use client";

import { cn } from "@/lib/utils";
import type { ChatMessage, MessageRole } from "@/app/features/prediction/v1/hooks/useChat";
import { ContractButton } from "../ContractButton";

interface ChatMessageItemProps {
  readonly message: ChatMessage;
  readonly isCurrentUserAdmin: boolean;
  readonly onDelete?: (messageId: string) => void;
  readonly isDeleting?: boolean;
  readonly className?: string;
}

function formatAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDisplayName(address: string, role: MessageRole): string {
  if (role === "SYSTEM") return "SYSTEM";
  if (role === "ADMIN") return "ADMIN";
  return formatAddress(address);
}

export function ChatMessageItem({
  message,
  isCurrentUserAdmin,
  onDelete,
  isDeleting,
  className,
}: ChatMessageItemProps) {
  const { role } = message;

  const handleDelete = () => {
    if (onDelete && !isDeleting) {
      onDelete(message.id);
    }
  };

  return (
    <div
      className={cn(
        "group px-3 py-2 border-b border-border/30 hover:bg-muted/30 transition-colors relative",
        role === "SYSTEM" && "bg-muted/20",
        role === "ADMIN" && "bg-primary/5",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={cn(
            "text-xs font-mono font-semibold",
            role === "SYSTEM" && "text-yellow-500",
            role === "ADMIN" && "text-red-500",
            role === "USER" && "text-primary"
          )}
        >
          {getDisplayName(message.address, role)}
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">
          {formatTime(message.timestamp)}
        </span>
        {isCurrentUserAdmin && onDelete && (
          <ContractButton
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className={cn(
              "ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "text-red-500 hover:text-red-400 hover:bg-red-500/10",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            title="Delete message"
          >
            [DEL]
          </ContractButton>
        )}
      </div>
      <p className="text-sm text-foreground/90 wrap-break-word leading-relaxed">
        {message.content}
      </p>
    </div>
  );
}
