"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useChat } from "@/app/hooks/useChat";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { useAppKitAccount } from "@reown/appkit/react";

interface ChatContainerProps {
  readonly className?: string;
}

export function ChatContainer({ className }: ChatContainerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { address, isConnected } = useAppKitAccount();
  const {
    messages,
    isLoading,
    isSending,
    isDeleting,
    userRole,
    sendMessage,
    deleteMessage,
  } = useChat(address);

  // Check if current user is admin based on their role from the server
  const isCurrentUserAdmin = userRole === "ADMIN";

  // Track the message count when user last opened the chat
  const lastSeenCountRef = useRef(messages.length);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  // Update lastSeenCount when chat is opened
  useEffect(() => {
    if (isOpen) {
      lastSeenCountRef.current = messages.length;
      setHasNewMessages(false);
    }
  }, [isOpen, messages.length]);

  // Check for new messages when closed
  useEffect(() => {
    if (!isOpen && messages.length > lastSeenCountRef.current) {
      setHasNewMessages(true);
    }
  }, [isOpen, messages.length]);

  // Handle message deletion - server will verify if user is admin
  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      if (address) {
        deleteMessage(messageId, address);
      }
    },
    [address, deleteMessage]
  );

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(
        "fixed z-40",
        // Desktop: right side, below header
        "md:right-4 md:bottom-4 md:top-auto md:w-80",
        // Mobile: bottom of screen, full width
        "bottom-0 left-0 right-0 md:left-auto",
        className
      )}
    >
      {/* Chat Header / Toggle */}
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center justify-between gap-2 px-4 py-3",
            "bg-card backdrop-blur-md border border-primary/30",
            "hover:bg-muted/50 hover:border-primary/50 transition-all cursor-pointer select-none",
            "shadow-[0_0_15px_rgba(255,106,0,0.2)]",
            "md:rounded-t-lg",
            isOpen ? "rounded-t-lg md:rounded-t-lg" : "md:rounded-lg shadow-[0_0_25px_rgba(255,106,0,0.25)]"
          )}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              ./global_chat
            </span>
            {!isOpen && hasNewMessages && (
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-2">
            {isOpen && (
              <span className="text-[10px] font-mono text-muted-foreground">
                {messages.length} msgs
              </span>
            )}
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>

      {/* Chat Content */}
      <CollapsibleContent
        className={cn(
          "bg-card backdrop-blur-md border-x border-b border-primary/30",
          "md:rounded-b-lg",
          "shadow-[0_4px_25px_rgba(255,106,0,0.15)]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          "duration-200"
        )}
      >
        <div
          className={cn(
            "flex flex-col",
            // Mobile: limited height
            "h-64",
            // Desktop: taller
            "md:h-96"
          )}
        >
          {/* Messages Area */}
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            isCurrentUserAdmin={isCurrentUserAdmin}
            onDeleteMessage={handleDeleteMessage}
            isDeleting={isDeleting}
          />

          {/* Input Area */}
          <ChatInput
            isConnected={isConnected}
            address={address}
            isSending={isSending}
            onSend={sendMessage}
          />
        </div>

        {/* Scanline overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-20 pointer-events-none bg-size-[100%_2px,3px_100%] opacity-20 rounded-b-lg" />
      </CollapsibleContent>
    </Collapsible>
  );
}
