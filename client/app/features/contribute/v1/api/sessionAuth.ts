import { readSessionFromRequest, type AuthSession } from "@/app/lib/siwe/session";
import { apiGatewayPost } from "./apiGateway";
import type { Contributor } from "./types";

export async function requireAuthenticatedSession(
  request: Request
): Promise<AuthSession> {
  const session = await readSessionFromRequest(request);

  if (!session?.address) {
    throw new Error("Authentication required");
  }

  return {
    address: session.address.toLowerCase(),
    chainId: session.chainId,
  };
}

export async function isContributorAdmin(address: string): Promise<boolean> {
  try {
    const res = await apiGatewayPost<{ contributor: Contributor }>(
      "/contributors/get",
      { id: address.toLowerCase() }
    );
    const roles = res.contributor.roles ?? [];
    return roles.includes("CORE") || roles.includes("ADMIN");
  } catch {
    return false;
  }
}

export async function requireContributorAdmin(address: string): Promise<void> {
  const isAdmin = await isContributorAdmin(address);
  if (!isAdmin) {
    throw new Error("Admin role required");
  }
}