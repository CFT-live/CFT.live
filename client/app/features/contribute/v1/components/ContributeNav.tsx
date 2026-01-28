"use client";

import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { User, Shield, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const { hasProfile, contributor, isAdmin, isLoading, ensureProfile } =
    useContributorProfile(address);

  return (
    <div className="flex flex-col gap-3 relative">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/contribute/features"
            className={`${isActive(pathname, "/contribute/features") || isActive(pathname, "/contribute") ? "text-primary" : "text-muted-foreground"} hover:text-primary transition-colors tracking-wider`}
          >
            Features
          </Link>
          <Link
            href="/contribute/profile"
            className={`${isActive(pathname, "/contribute/profile") ? "text-primary" : "text-muted-foreground"} hover:text-primary transition-colors tracking-wider`}
          >
            Profile
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasProfile === false && (
            <Button asChild variant="default">
              <Link href="/contribute/profile">
                <User className="w-4 h-4" />
                Create profile
              </Link>
            </Button>
          )}
          {contributor ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-primary/30 bg-primary/5">
              <User className="w-4 h-4 text-primary" />
              <span className="font-mono text-sm">{contributor.username}</span>
              {isAdmin && (
                <Badge variant="default" className="text-xs px-1.5 py-0">
                  <Shield className="w-3 h-3 mr-1" />
                  CORE
                </Badge>
              )}
            </div>
          ) : (
            <Button
              onClick={() => (isConnected ? ensureProfile() : open())}
              variant="default"
            >
              sign in
            </Button>
          )}
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        </div>
      </div>
    </div>
  );
}
