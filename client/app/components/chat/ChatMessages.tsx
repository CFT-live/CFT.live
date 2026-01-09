"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/app/hooks/useChat";
import { ChatMessageItem } from "./ChatMessage";

interface ChatMessagesProps {
  readonly messages: ChatMessage[];
  readonly isLoading: boolean;
  readonly isCurrentUserAdmin: boolean;
  readonly onDeleteMessage?: (messageId: string) => void;
  readonly isDeleting?: boolean;
  readonly className?: string;
}

export function ChatMessages({
  messages,
  isLoading,
  isCurrentUserAdmin,
  onDeleteMessage,
  isDeleting,
  className,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef(true);

  // Check if user is near bottom to enable auto-scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // If within 100px of bottom, enable auto-scroll
    isAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isAutoScrollRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (isLoading) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", className)}>
        <div className="text-xs font-mono text-muted-foreground animate-pulse">
          {">"} Loading messages...
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", className)}>
        <div className="text-xs font-mono text-muted-foreground text-center px-4">
          <p>{">"} No messages yet.</p>
          <p className="mt-1 opacity-70">Connect wallet to start chatting.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn(
        "flex-1 overflow-y-auto custom-scrollbar",
        className
      )}
    >
      {messages.map((message) => (
        <ChatMessageItem
          key={message.id}
          message={message}
          isCurrentUserAdmin={isCurrentUserAdmin}
          onDelete={onDeleteMessage}
          isDeleting={isDeleting}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
