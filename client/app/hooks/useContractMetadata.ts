import { CONTRACT_METADATA_QUERY_KEY } from "@/app/queries/keys";
import { getContractMetadata } from "@/app/lib/api/actions";
import { REFRESH_INTERVAL_MILLIS } from "@/app/helpers";
import { useQuery } from "./useQuery";

export const useContractMetadata = () => {
  return useQuery({
    queryKey: [CONTRACT_METADATA_QUERY_KEY],
    queryFn: getContractMetadata,
    staleTime: REFRESH_INTERVAL_MILLIS.long,
    // This prevents refetching on every mount since data is prefetched
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
