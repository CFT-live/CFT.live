import { CONTRACT_PRICE_FEEDS_QUERY_KEY } from "../queries/keys";
import { getContractPriceFeeds } from "../api/actions";
import { REFRESH_INTERVAL_MILLIS } from "@/app/helpers";
import { useQuery } from "./useQuery";

export const useContractPriceFeeds = () => {
  return useQuery({
    queryKey: [CONTRACT_PRICE_FEEDS_QUERY_KEY],
    queryFn: getContractPriceFeeds,
    staleTime: REFRESH_INTERVAL_MILLIS.long,
    // This prevents refetching on every mount since data is prefetched
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
