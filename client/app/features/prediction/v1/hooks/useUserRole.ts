"use client";

import { useEffect, useRef, useState } from "react";

export type UserRole = "USER" | "ADMIN" | "SYSTEM";

async function fetchUserRole(address: string): Promise<UserRole> {
  try {
    const response = await fetch("/api/chat/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });

    if (response.ok) {
      const data: { role?: UserRole } = await response.json();
      return data.role ?? "USER";
    }
  } catch (error) {
    console.warn("Failed to fetch user role:", error);
  }

  return "USER";
}

/**
 * Fetches the user's role (USER/ADMIN/SYSTEM) without chat message polling.
 */
export function useUserRole(address?: string) {
  const [userRole, setUserRole] = useState<UserRole>("USER");
  const lastCheckedAddressRef = useRef<string | null>(null);

  useEffect(() => {
    if (address && address !== lastCheckedAddressRef.current) {
      lastCheckedAddressRef.current = address;
      fetchUserRole(address).then(setUserRole);
      return;
    }

    if (!address) {
      lastCheckedAddressRef.current = null;
      setUserRole("USER");
    }
  }, [address]);

  return userRole;
}
