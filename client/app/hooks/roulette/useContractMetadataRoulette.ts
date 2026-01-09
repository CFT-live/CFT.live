"use client";

import { useQuery } from "@tanstack/react-query";
import { ROULETTE_CONTRACT_METADATA_QUERY_KEY } from "@/app/queries/keys";
import { getMetadata } from "@/app/lib/api/actions.roulette";
import { REFRESH_INTERVAL_MILLIS } from "@/app/helpers";

export const useContractMetadata = () => {
  return useQuery({
    queryKey: [ROULETTE_CONTRACT_METADATA_QUERY_KEY],
    queryFn: getMetadata,
    staleTime: REFRESH_INTERVAL_MILLIS.long,
    refetchInterval: REFRESH_INTERVAL_MILLIS.long,
  });
};
