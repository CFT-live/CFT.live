"use client";

import { useState, useCallback, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { SendHorizontal } from "lucide-react";

interface ChatInputProps {
  readonly isConnected: boolean;
  readonly address?: string;
  readonly isSending: boolean;
  readonly onSend: (address: string, content: string) => Promise<boolean>;
  readonly className?: string;
}

const MAX_MESSAGE_LENGTH = 500;

export function ChatInput({
  isConnected,
  address,
  isSending,
  onSend,
  className,
}: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = useCallback(async () => {
    if (!isConnected || !address || !message.trim() || isSending) return;

    const success = await onSend(address, message.trim());
    if (success) {
      setMessage("");
    }
  }, [isConnected, address, message, isSending, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isConnected) {
    return (
      <div
        className={cn(
          "px-3 py-2 border-t border-border bg-muted/30",
          className
        )}
      >
        <div className="text-xs font-mono text-muted-foreground text-center py-1">
          {">"} Connect wallet to chat
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "px-3 py-2 border-t border-border bg-muted/30",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-primary font-mono text-sm">{">"}</span>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isSending}
          className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-foreground placeholder:text-muted-foreground/50 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          className="p-1 text-primary hover:text-primary/80 disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
          aria-label="Send message"
        >
          <SendHorizontal className="w-4 h-4" />
        </button>
      </div>
      {message.length > MAX_MESSAGE_LENGTH - 50 && (
        <div className="text-[10px] text-muted-foreground mt-1 text-right">
          {message.length}/{MAX_MESSAGE_LENGTH}
        </div>
      )}
    </div>
  );
}
