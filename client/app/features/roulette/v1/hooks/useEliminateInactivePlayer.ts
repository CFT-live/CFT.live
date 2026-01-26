"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeWriteContractRoulette } from "./useSafeWriteContractRoulette";
import {
  ROULETTE_IN_PROGRESS_TABLES_QUERY_KEY,
  ROULETTE_FINISHED_TABLES_QUERY_KEY,
  ROULETTE_TABLE_DETAIL_QUERY_KEY,
} from "../queries/keys";

export function useEliminateInactivePlayer() {
  const queryClient = useQueryClient();

  const onSuccess = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [ROULETTE_IN_PROGRESS_TABLES_QUERY_KEY],
    });
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

  const eliminateInactivePlayer = useCallback(
    (tableId: number) => {
      writeToContract("eliminateInactivePlayer", [BigInt(tableId)]);
    },
    [writeToContract]
  );

  return {
    eliminateInactivePlayer,
    isLoading,
    isSuccess,
    errorMessage,
    hash,
    reset,
  };
}
