import { useState, useEffect, useCallback } from "react";
import { getMyContributor } from "../api/api";
import type { Contributor } from "../api/types";

type CachedProfile = {
  address: string;
  hasProfile: boolean;
  isAdmin: boolean;
  contributor: Contributor | null;
  timestamp: number;
};

const CACHE_KEY = "cft_profile_cache";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

function getCachedProfile(address: string): CachedProfile | null {
  if (typeof window === "undefined") return null;

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
  } catch {
    return null;
  }
}

function setCachedProfile(profile: CachedProfile): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage errors
  }
}

export function useContributorProfile(address: string | undefined) {
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
    const cached = !force ? getCachedProfile(address) : null;
    if (cached?.hasProfile) {
      setHasProfile(cached.hasProfile);
      setIsAdmin(cached.isAdmin);
      setContributor(cached.contributor);
      return cached.hasProfile;
    }

    // Fetch fresh profile data
    setIsLoading(true);
    try {
      const res = await getMyContributor();
      setHasProfile(true);
      setIsAdmin((res.contributor.roles ?? []).includes("ADMIN") || (res.contributor.roles ?? []).includes("CORE"));
      setContributor(res.contributor);

      // Cache the result
      setCachedProfile({
        address,
        hasProfile: true,
        isAdmin: (res.contributor.roles ?? []).includes("ADMIN") || (res.contributor.roles ?? []).includes("CORE"),
        contributor: res.contributor,
        timestamp: Date.now(),
      });

      return true;
    } catch {
      setHasProfile(false);
      setIsAdmin(false);
      setContributor(null);

      // Don't cache negative result in sessionStorage; it can easily become stale
      // and "stick" across reloads after a user creates a profile.
      try {
        sessionStorage.removeItem(CACHE_KEY);
      } catch {
        // Ignore
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

  // Note: We don't need the second useEffect anymore since we initialize from cache
  // and update on address change

  return {
    isAdmin,
    hasProfile,
    contributor,
    isLoading,
    ensureProfile,
  };
}
