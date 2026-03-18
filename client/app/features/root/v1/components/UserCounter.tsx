"use client";

import { useUserPresence } from "@/app/features/prediction/v1/hooks/useUserPresence";
import { useUserRole } from "@/app/features/prediction/v1/hooks/useUserRole";
import { useAppKitAccount } from "@reown/appkit/react";
import { Users } from "lucide-react";

export function UserCounter() {
  const { address } = useAppKitAccount();
  const { count, isConnected } = useUserPresence();
  const userRole = useUserRole(address);

  // Check if current user is admin based on their role from the server
  const isCurrentUserAdmin = userRole === "ADMIN";

  if (!isCurrentUserAdmin) {
    return null;
  }

  // Don't show the counter if not connected (likely local dev without Durable Objects)
  if (count === 0 && !isConnected) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-border bg-background/50 backdrop-blur-sm">
      <div className="relative">
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        {isConnected && (
          <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-mono font-semibold tabular-nums">
          {count}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {`${count === 1 ? "user" : "users"} online`}
        </span>
      </div>
    </div>
  );
}
