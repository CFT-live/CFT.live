"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeWriteContractRoulette } from "../useSafeWriteContractRoulette";
import {
  ROULETTE_OPEN_TABLES_QUERY_KEY,
  ROULETTE_CONTRACT_METADATA_QUERY_KEY,
} from "@/app/queries/keys";
import { usdcToWei } from "@/app/helpers";

export function useCreateTable() {
  const queryClient = useQueryClient();

  const onSuccess = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [ROULETTE_OPEN_TABLES_QUERY_KEY],
    });
    queryClient.invalidateQueries({
      queryKey: [ROULETTE_CONTRACT_METADATA_QUERY_KEY],
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

  const createTable = useCallback(
    (betAmount: number, maxIncrement: number, maxPlayers: number) => {
    writeToContract("createTable", [
      BigInt(usdcToWei(betAmount)),
      BigInt(usdcToWei(maxIncrement)),
      maxPlayers,
    ]);
    },
    [writeToContract]
  );

  return {
    createTable,
    isLoading,
    isSuccess,
    errorMessage,
    hash,
    reset,
  };
}
