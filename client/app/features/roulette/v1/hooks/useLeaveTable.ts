"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeWriteContractRoulette } from "./useSafeWriteContractRoulette";
import {
  ROULETTE_OPEN_TABLES_QUERY_KEY,
  ROULETTE_IN_PROGRESS_TABLES_QUERY_KEY,
  ROULETTE_USER_ACTIVE_TABLES_QUERY_KEY,
  ROULETTE_TABLE_DETAIL_QUERY_KEY,
} from "../queries/keys";

export function useLeaveTable() {
  const queryClient = useQueryClient();

  const onSuccess = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [ROULETTE_OPEN_TABLES_QUERY_KEY],
    });
    queryClient.invalidateQueries({
      queryKey: [ROULETTE_IN_PROGRESS_TABLES_QUERY_KEY],
    });
    queryClient.invalidateQueries({
      queryKey: [ROULETTE_USER_ACTIVE_TABLES_QUERY_KEY],
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

  const leaveTable = useCallback(
    (tableId: number) => {
      writeToContract("leaveTable", [BigInt(tableId)]);
    },
    [writeToContract]
  );

  return {
    leaveTable,
    isLoading,
    isSuccess,
    errorMessage,
    hash,
    reset,
  };
}
