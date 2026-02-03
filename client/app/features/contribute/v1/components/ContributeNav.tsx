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

  const uiButton = () => {
    if (hasProfile === false) {
      // Don't show button if already on create-profile page
      if (isActive(pathname, "/contribute/create-profile")) {
        return null;
      }
      return (
        <Button asChild variant="default">
          <Link href="/contribute/create-profile">
            <User className="w-4 h-4" />
            Create profile
          </Link>
        </Button>
      );
    }
    return contributor ? (
      <Link
        href="/contribute/profile"
        //className={`${isActive(pathname, "/contribute/profile") ? "text-primary" : "text-muted-foreground"} hover:text-primary transition-colors tracking-wider`}
      >
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
      </Link>
    ) : (
      <Button
        onClick={() => (isConnected ? ensureProfile() : open())}
        variant="default"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
      </Button>
    );
  };

  return (
    <div className="flex flex-col gap-3 relative">
      <div className="flex justify-end">{uiButton()}</div>
    </div>
  );
}
