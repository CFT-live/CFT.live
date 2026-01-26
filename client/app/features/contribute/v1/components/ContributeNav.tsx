"use client";

import { useEffect } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";

import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/routing";

import { useContributorProfile } from "../hooks/useContributorProfile";

function isActive(pathname: string, href: string): boolean {
  if (href === "/contribute") return pathname === "/contribute";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ContributeNav() {
  const pathname = usePathname();
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const { hasProfile, contributor, isAdmin, ensureProfile, isLoading } = useContributorProfile(address);

  useEffect(() => {
    if (address) void ensureProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant={isActive(pathname, "/contribute/features") ? "secondary" : "outline"}>
          <Link href="/contribute/features">Features</Link>
        </Button>
        <Button asChild variant={isActive(pathname, "/contribute/profile") ? "secondary" : "outline"}>
          <Link href="/contribute/profile">Profile</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!isConnected ? (
          <Button onClick={() => open()} variant="outline">
            Connect wallet
          </Button>
        ) : hasProfile === false ? (
          <Button asChild variant="outline">
            <Link href="/contribute/profile">Create profile</Link>
          </Button>
        ) : contributor ? (
          <Button variant="outline" disabled>
            {contributor.username}{isAdmin ? " (core)" : ""}
          </Button>
        ) : (
          <Button variant="outline" disabled>
            {isLoading ? "Loading profile…" : address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connected"}
          </Button>
        )}
      </div>
    </div>
  );
}
