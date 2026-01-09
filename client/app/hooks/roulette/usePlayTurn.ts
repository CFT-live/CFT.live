"use client";

import { useCallback, useEffect, useRef } from "react";
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeWriteContractRoulette } from "../useSafeWriteContractRoulette";
import {
  ROULETTE_ADDRESS,
  USDC_ADDRESS,
  erc20Abi,
} from "@/app/lib/contracts";
import {
  ROULETTE_IN_PROGRESS_TABLES_QUERY_KEY,
  ROULETTE_USER_ACTIVE_TABLES_QUERY_KEY,
  ROULETTE_TABLE_DETAIL_QUERY_KEY,
} from "@/app/queries/keys";
import { usdcToWei } from "@/app/helpers";

export function usePlayTurn() {
  const { address } = useAppKitAccount();
  const queryClient = useQueryClient();
  const pendingTurn = useRef<{tableId: number, amount: number, playerRandom: number} | null>(null);

  // Check USDC allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address as `0x${string}`, ROULETTE_ADDRESS] : undefined,
    query: {
      enabled: Boolean(address),
    },
  });

  // Hook for USDC approval (separate from Roulette contract)
  const { mutate, data: hash, isPending } = useWriteContract();

  const { isSuccess: isAllowanceSuccess } =
    useWaitForTransactionReceipt({
      hash,
    });



  const onSuccess = useCallback(() => {
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
    reset,
  } = useSafeWriteContractRoulette(onSuccess);

  useEffect(() => {
    if (isAllowanceSuccess && pendingTurn.current) {
      // Refetch allowance to get the updated value
      refetchAllowance().then(() => {
        if (pendingTurn.current) {
          const {tableId, amount, playerRandom} = pendingTurn.current;
          writeToContract("playTurn", [
            BigInt(tableId),
            BigInt(usdcToWei(amount)),
            BigInt(playerRandom),
          ]);
          pendingTurn.current = null;
        }
      });
    }
  }, [isAllowanceSuccess, refetchAllowance, writeToContract]);

  // Refetch allowance after successful deposit to ensure fresh data for next deposit
  useEffect(() => {
    if (isSuccess) {
      refetchAllowance();
    }
  }, [isSuccess, refetchAllowance]);

  const approve = (value: bigint) => {
    // For unlimited approval, use maxUint256
    mutate({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [ROULETTE_ADDRESS, value],
    });
  };

  const needsApproval = useCallback(
    (need: bigint) => {
      if (!address || allowance === undefined) return false;
      if (!need) return false;
      return allowance < need;
    },
    [address, allowance]
  );

  const playTurn = (tableId: number, betAmount: number, playerRandom: number) => {
    const betAmountWei = usdcToWei(betAmount);
    if (needsApproval(betAmountWei)) {
      console.log("Play needs approval, initiating approval first");
      pendingTurn.current = { tableId, amount: betAmount, playerRandom };
      approve(betAmountWei);
      return;
    }
    writeToContract("playTurn", [
      BigInt(tableId),
      BigInt(usdcToWei(betAmount)),
      BigInt(playerRandom),
    ]);
  };

  return {
    playTurn,
    needsApproval,
    isLoading: isLoading || isPending,
    isSuccess,
    errorMessage,
    reset,
  };
}
