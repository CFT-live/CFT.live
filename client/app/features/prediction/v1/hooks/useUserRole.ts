"use client";

import { useState } from "react";

export type UserRole = "USER" | "ADMIN" | "SYSTEM";

// TODO: Implement real logic to fetch user role from the server based on their address
export function useUserRole(address?: string) {
  const [userRole, setUserRole] = useState<UserRole>("USER");
  return userRole;
}
