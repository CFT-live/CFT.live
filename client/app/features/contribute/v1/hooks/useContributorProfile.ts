import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { getAuthSession, getMyContributor } from "../api/api";
import type { Contributor } from "../api/types";
import { MILLIS } from "@/app/helpers";

type CachedProfile = {
  address: string;
  hasProfile: boolean;
  isAdmin: boolean;
  contributor: Contributor | null;
  timestamp: number;
};

const CACHE_KEY = "cft_profile_cache";
const CACHE_DURATION = 12 * MILLIS.inHour;

function getCachedProfile(address: string): CachedProfile | null {
  if (globalThis.sessionStorage === undefined) return null;

  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CachedProfile = JSON.parse(cached);

    // Validate cache: must match address and not be expired
    if (
      data.address.toLowerCase() === address.toLowerCase() &&
      Date.now() - data.timestamp < CACHE_DURATION
    ) {
      // Only trust positive cache entries. Negative entries (no profile) can
      // become stale quickly after a user creates a profile in another tab.
      return data.hasProfile ? data : null;
    }

    // Clear invalid cache
    sessionStorage.removeItem(CACHE_KEY);
    return null;
  } catch (e) {
    console.warn("Failed to remove profile cache", e);
    return null;
  }
}

function setCachedProfile(profile: CachedProfile): void {
  if (globalThis.sessionStorage === undefined) return;

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn("Failed to set profile cache", e);
  }
}

export function useContributorProfile(address: string | undefined) {
  const pathname = usePathname();
  
  // Try to load from cache immediately on mount
  const initialCache = address ? getCachedProfile(address) : null;
  const [isAdmin, setIsAdmin] = useState(initialCache?.isAdmin ?? false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(initialCache?.hasProfile ?? null);
  const [contributor, setContributor] = useState<Contributor | null>(initialCache?.contributor ?? null);
  const [isLoading, setIsLoading] = useState(false);

  // Check profile and return whether user has a valid profile
  const ensureProfile = useCallback(async (force?: boolean): Promise<boolean> => {
    if (!address) {
      return false;
    }

    // If we already checked, return cached result unless caller forces refresh.
    if (!force && hasProfile !== null) {
      return hasProfile;
    }

    // Check session storage cache first
    let cached: CachedProfile | null = null;
    if (!force) {
      cached = getCachedProfile(address);
    }
    if (cached?.hasProfile) {
      setHasProfile(cached.hasProfile);
      setIsAdmin(cached.isAdmin);
      setContributor(cached.contributor);
      return cached.hasProfile;
    }

    // Fetch fresh profile data
    setIsLoading(true);
    try {
      const session = await getAuthSession();
      if (session?.address?.toLowerCase() !== address.toLowerCase()) {
        setHasProfile(null);
        setIsAdmin(false);
        setContributor(null);
        return false;
      }

      const res = await getMyContributor();
      const isUserAdmin = (res.contributor.roles ?? []).includes("ADMIN") || (res.contributor.roles ?? []).includes("CORE");
      setHasProfile(true);
      setIsAdmin(isUserAdmin);
      setContributor(res.contributor);

      // Cache the result
      setCachedProfile({
        address,
        hasProfile: true,
        isAdmin: isUserAdmin,
        contributor: res.contributor,
        timestamp: Date.now(),
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isAuthError = message.includes("Authentication required");

      setHasProfile(isAuthError ? null : false);
      setIsAdmin(false);
      setContributor(null);

      // Don't cache negative result in sessionStorage; it can easily become stale
      // and "stick" across reloads after a user creates a profile.
      try {
        sessionStorage.removeItem(CACHE_KEY);
      } catch (e) {
        console.warn("Failed to clear profile cache", e);
      }

      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, hasProfile]);

  // Reset profile state when address changes
  useEffect(() => {
    // Check if new address has a cached profile
    const cached = address ? getCachedProfile(address) : null;
    
    if (cached) {
      setIsAdmin(cached.isAdmin);
      setHasProfile(cached.hasProfile);
      setContributor(cached.contributor);
    } else {
      setIsAdmin(false);
      setHasProfile(null);
      setContributor(null);
    }
  }, [address]);

  // Re-check cache on pathname changes (navigation events)
  useEffect(() => {
    if (!address || !pathname) return;

    // Check if cached profile differs from current state
    const cached = getCachedProfile(address);
    if (cached) {
      // Only update if cache indicates a profile exists but our state says otherwise
      if (cached.hasProfile && hasProfile !== true) {
        setIsAdmin(cached.isAdmin);
        setHasProfile(cached.hasProfile);
        setContributor(cached.contributor);
      }
    }
  }, [pathname, address, hasProfile]);

  return {
    isAdmin,
    hasProfile,
    contributor,
    isLoading,
    ensureProfile,
  };
}
