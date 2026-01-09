"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type MessageRole = "USER" | "ADMIN" | "SYSTEM";

export interface ChatMessage {
  id: string;
  address: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

const POLLING_INTERVAL_MS = 15000; // Poll every 15 seconds

/**
 * Fetch the role for a given wallet address
 */
async function fetchUserRole(address: string): Promise<MessageRole> {
  try {
    const response = await fetch("/api/chat/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });

    if (response.ok) {
      const data: { role?: MessageRole } = await response.json();
      return data.role ?? "USER";
    }
  } catch (error) {
    console.warn("Failed to fetch user role:", error);
  }
  return "USER";
}

/**
 * Chat hook that manages message state with HTTP polling.
 * Messages are fetched from a Cloudflare Durable Object that persists the last 100 messages.
 */
export function useChat(userAddress?: string) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: true,
    error: null,
  });
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userRole, setUserRole] = useState<MessageRole>("USER");
  const pollingIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastMessageIdRef = useRef<string | null>(null);
  const lastCheckedAddressRef = useRef<string | null>(null);
  // Fetch user role when address changes
  useEffect(() => {
    if (userAddress && userAddress !== lastCheckedAddressRef.current) {
      lastCheckedAddressRef.current = userAddress;
      fetchUserRole(userAddress).then(setUserRole);
    } else if (!userAddress) {
      lastCheckedAddressRef.current = null;
      setUserRole("USER");
    }
  }, [userAddress]);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch("/api/chat");

      if (response.ok) {
        const data: { messages?: ChatMessage[] } = await response.json();
        const messages: ChatMessage[] = data.messages ?? [];
        
        // Only update if there are new messages
        const latestId = messages.length > 0 ? messages.at(-1)?.id ?? null : null;
        if (latestId !== lastMessageIdRef.current) {
          lastMessageIdRef.current = latestId;
          setState({
            messages,
            isLoading: false,
            error: null,
          });
        } else if (state.isLoading) {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: "Failed to fetch messages",
        }));
      }
    } catch (error) {
      console.warn("Failed to fetch chat messages:", error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: String(error),
      }));
    }
  }, [state.isLoading]);

  const sendMessage = useCallback(
    async (address: string, content: string): Promise<boolean> => {
      if (isSending) return false;

      setIsSending(true);
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, content }),
        });

        if (response.ok) {
          const data: { message: ChatMessage } = await response.json();
          const newMessage: ChatMessage = data.message;

          // Optimistically add the message to the list
          setState(prev => ({
            ...prev,
            messages: [...prev.messages.slice(-99), newMessage],
          }));
          lastMessageIdRef.current = newMessage.id;
          
          return true;
        } else {
          const errorData: { error?: string } = await response.json();
          console.error("Failed to send message:", errorData.error);
          return false;
        }
      } catch (error) {
        console.error("Failed to send chat message:", error);
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [isSending]
  );

  const deleteMessage = useCallback(
    async (messageId: string, senderAddress: string): Promise<boolean> => {
      if (isDeleting) return false;

      setIsDeleting(true);
      try {
        const response = await fetch("/api/chat", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, senderAddress }),
        });

        if (response.ok) {
          // Optimistically remove the message from the list
          setState(prev => ({
            ...prev,
            messages: prev.messages.filter(m => m.id !== messageId),
          }));
          
          return true;
        } else {
          const errorData: { error?: string } = await response.json();
          console.error("Failed to delete message:", errorData.error);
          return false;
        }
      } catch (error) {
        console.error("Failed to delete chat message:", error);
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [isDeleting]
  );

  useEffect(() => {
    // Initial fetch
    fetchMessages();

    // Poll for new messages
    pollingIntervalRef.current = setInterval(fetchMessages, POLLING_INTERVAL_MS);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchMessages]);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    isSending,
    isDeleting,
    userRole,
    sendMessage,
    deleteMessage,
  };
}
