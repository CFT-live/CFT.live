import { REFRESH_INTERVAL_MILLIS } from "../../helpers";
import { getMetadata, LottoMetadata } from "../../lib/api/actions.lotto";
import { LOTTO_CONTRACT_METADATA_QUERY_KEY } from "../../queries/keys";
import { useQuery } from "../useQuery";

export function useContractMetadata() {
  return useQuery<LottoMetadata>({
    queryKey: [LOTTO_CONTRACT_METADATA_QUERY_KEY],
    queryFn: async () => {
      const metadata = await getMetadata();
      if (!metadata) {
        throw new Error("Failed to fetch Lotto contract metadata");
      }
      return metadata;
    },
    staleTime: REFRESH_INTERVAL_MILLIS.long,
    refetchInterval: false, // Don't auto-refetch
    retry: 3,
  });
}
