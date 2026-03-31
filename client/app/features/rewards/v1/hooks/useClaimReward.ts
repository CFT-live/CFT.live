"use client";

import { useCallback, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { TOKEN_FAUCET_ABI, TOKEN_FAUCET_ADDRESS } from "@/app/lib/contracts";

export function useClaimReward() {
  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({ hash: txHash });

  const claim = useCallback(
    (tokenAmount: number, tokenDecimals = 18) => {
      const amountRaw = parseUnits(String(tokenAmount), tokenDecimals);
      writeContract({
        address: TOKEN_FAUCET_ADDRESS,
        abi: TOKEN_FAUCET_ABI,
        functionName: "claim",
        args: [amountRaw],
      });
    },
    [writeContract],
  );

  const error = writeError ?? receiptError;

  return {
    claim,
    txHash,
    isPending: isPending || isConfirming,
    isSuccess,
    error: error ? (error as Error).message : null,
  };
}
