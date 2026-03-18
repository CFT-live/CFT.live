import { useCallback, useEffect, useRef } from "react";
import {
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  erc20Abi,
  LOTTO_ADDRESS,
  USDC_ADDRESS,
} from "@/app/lib/contracts";
import { useSafeWriteContractLotto } from "./useSafeWriteContractLotto";

export function useBuyTickets(onSuccess?: () => void) {
  const { address } = useAppKitAccount();
  const pendingBuyAmount = useRef<{ tickets: number; cost: bigint } | null>(
    null
  );

  const { mutate, data: hash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isAllowanceSuccess } =
    useWaitForTransactionReceipt({
      hash,
    });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address as `0x${string}`, LOTTO_ADDRESS] : undefined,
    query: { enabled: Boolean(address) },
  });

  const {
    writeToContract,
    isLoading: buyLoading,
    isSuccess: isBuySuccess,
    errorMessage,
    reset,
  } = useSafeWriteContractLotto(onSuccess);

  // Auto-continue with buy after approval is successful
  useEffect(() => {
    if (isAllowanceSuccess && pendingBuyAmount.current) {
      // Refetch allowance to get the updated value
      refetchAllowance().then(() => {
        const { tickets } = pendingBuyAmount.current!;
        writeToContract("buyTickets", [tickets]);
        pendingBuyAmount.current = null;
      });
    }
  }, [isAllowanceSuccess, refetchAllowance, writeToContract]);

  // Refetch allowance after successful buy to ensure fresh data for next buy
  useEffect(() => {
    if (isBuySuccess) {
      refetchAllowance();
    }
  }, [isBuySuccess, refetchAllowance]);

  const needsApproval = useCallback(
    (need: bigint) => {
      if (!address || allowance === undefined) return false;
      if (!need) return false;
      return allowance < need;
    },
    [address, allowance]
  );

  const buyTickets = useCallback(
    (amount: number, totalCostInWei: bigint) => {
      console.log(`Attempting to buy ${amount} tickets for total cost ${totalCostInWei} wei`);
      if (needsApproval(totalCostInWei)) {
        console.log("Buy needs approval, initiating approval first");
        pendingBuyAmount.current = { tickets: amount, cost: totalCostInWei };
        mutate({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: "approve",
          args: [LOTTO_ADDRESS, totalCostInWei],
        });
        return;
      }
      writeToContract("buyTickets", [amount]);
    },
    [needsApproval, writeToContract, mutate]
  );

  return {
    buyTickets,
    isLoading: buyLoading || isPending || isConfirming,
    errorMessage,
    reset,
  };
}
