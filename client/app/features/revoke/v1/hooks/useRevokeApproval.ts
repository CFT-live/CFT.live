"use client";

import { useCallback, useEffect, useRef } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useWalletConfirmation } from "@/app/providers/WalletConfirmationProvider";
import { erc20Abi } from "@/app/lib/contracts";
import type { TokenApproval } from "../types";

export function useRevokeApproval(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { beginWalletConfirmation, endWalletConfirmation } = useWalletConfirmation();
  const confirmIdRef = useRef<string | null>(null);

  const { mutate, data: hash, isPending, error, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });

  const revoke = useCallback(
    (approval: TokenApproval) => {
      const displayName =
        approval.spenderLabel ?? `${approval.spenderAddress.slice(0, 8)}…`;
      const id = beginWalletConfirmation(
        `Revoking ${approval.tokenSymbol} approval for ${displayName}…`,
      );
      confirmIdRef.current = id;

      mutate({
        address: approval.tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [approval.spenderAddress, BigInt(0)],
      });
    },
    [mutate, beginWalletConfirmation],
  );

  useEffect(() => {
    if (hash && confirmIdRef.current) {
      endWalletConfirmation(confirmIdRef.current);
      confirmIdRef.current = null;
    }
  }, [hash, endWalletConfirmation]);

  useEffect(() => {
    if (error && confirmIdRef.current) {
      endWalletConfirmation(confirmIdRef.current);
      confirmIdRef.current = null;
    }
  }, [error, endWalletConfirmation]);

  useEffect(() => {
    if (isSuccess) {
      queryClient.invalidateQueries({ queryKey: ["approvalLogs"] });
      onSuccess?.();
    }
  }, [isSuccess, queryClient, onSuccess]);

  return {
    revoke,
    hash,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    reset,
  };
}
