"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface PresenceData {
  count: number;
  timestamp: number;
}

/**
 * Simple presence hook that tracks unique users active in a configurable time window.
 * Uses HTTP polling to periodically ping the server and fetch the current count.
 */
export function useUserPresence() {
  const [count, setCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const clientIdRef = useRef<string | null>(null);

  // Get or create a persistent client ID stored in localStorage
  const getClientId = useCallback(() => {
    if (clientIdRef.current) return clientIdRef.current;

    const storageKey = "presence-client-id";
    let clientId = localStorage.getItem(storageKey);

    if (!clientId) {
      clientId = crypto.randomUUID();
      localStorage.setItem(storageKey, clientId);
    }

    clientIdRef.current = clientId;
    return clientId;
  }, []);

  const pingPresence = useCallback(async () => {
    try {
      const clientId = getClientId();
      const response = await fetch(`/api/presence?clientId=${clientId}`);

      if (response.ok) {
        const data: PresenceData = await response.json();
        setCount(data.count);
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.warn("Failed to fetch presence data:", error);
      setIsConnected(false);
    }
  }, [getClientId]);

  useEffect(() => {
    // Initial ping
    pingPresence();

    // Poll every 30 seconds to keep presence alive and get updated count
    pollingIntervalRef.current = setInterval(pingPresence, 30000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [pingPresence]);

  return {
    count,
    isConnected,
  };
}
