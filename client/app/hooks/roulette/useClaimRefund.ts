"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeWriteContractRoulette } from "../useSafeWriteContractRoulette";
import {
  ROULETTE_FINISHED_TABLES_QUERY_KEY,
  ROULETTE_TABLE_DETAIL_QUERY_KEY,
} from "@/app/queries/keys";

export function useClaimRefund() {
  const queryClient = useQueryClient();

  const onSuccess = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [ROULETTE_FINISHED_TABLES_QUERY_KEY],
    });
    queryClient.invalidateQueries({
      queryKey: [ROULETTE_TABLE_DETAIL_QUERY_KEY],
    });
  }, [queryClient]);

  const {
    writeToContract,
    isSuccess,
    isLoading,
    errorMessage,
    hash,
    reset,
  } = useSafeWriteContractRoulette(onSuccess);

  const claimRefund = useCallback(
    (tableId: number) => {
      writeToContract("claimRefund", [BigInt(tableId)]);
    },
    [writeToContract]
  );

  return {
    claimRefund,
    isLoading,
    isSuccess,
    errorMessage,
    hash,
    reset,
  };
}
