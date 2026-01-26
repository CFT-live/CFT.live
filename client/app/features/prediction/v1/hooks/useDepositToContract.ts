import {
  erc20Abi,
  PREDICTION_MARKET_ADDRESS,
  USDC_ADDRESS,
} from "@/app/lib/contracts";
import { useCallback, useEffect, useRef } from "react";
import {
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import { useSafeWriteContract } from "./useSafeWriteContract";
import { usdcToWei } from "../../../../helpers";

export function useDepositToContract(onSuccess?: () => void) {
  const { address } = useAppKitAccount();
  const pendingDepositAmount = useRef<bigint | null>(null);

  const { mutate, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isAllowanceSuccess } =
    useWaitForTransactionReceipt({
      hash,
    });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address as `0x${string}`, PREDICTION_MARKET_ADDRESS] : undefined,
    query: { enabled: Boolean(address) },
  });

  const {
    writeToContract,
    isLoading: depositLoading,
    isSuccess: isDepositSuccess,
    error: depositError,
    errorMessage,
  } = useSafeWriteContract(onSuccess);

  // Auto-continue with deposit after approval is successful
  useEffect(() => {
    if (isAllowanceSuccess && pendingDepositAmount.current) {
      // Refetch allowance to get the updated value
      refetchAllowance().then(() => {
        const amount = pendingDepositAmount.current;
        if (amount) {
          writeToContract("deposit", [amount]);
          pendingDepositAmount.current = null;
        }
      });
    }
  }, [isAllowanceSuccess, refetchAllowance, writeToContract]);

  // Refetch allowance after successful deposit to ensure fresh data for next deposit
  useEffect(() => {
    if (isDepositSuccess) {
      refetchAllowance();
    }
  }, [isDepositSuccess, refetchAllowance]);

  const needsApproval = useCallback(
    (need: bigint) => {
      if (!address || allowance === undefined) return false;
      if (!need) return false;
      return allowance < need;
    },
    [address, allowance]
  );

  const approve = (value: bigint) => {
    // For unlimited approval, use maxUint256
    // const value = maxUint256;
    mutate({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [PREDICTION_MARKET_ADDRESS, value],
    });
  };

  const deposit = (amount: number) => {
    const depositAmount = usdcToWei(amount); // USDC has 6 decimals
    if (needsApproval(depositAmount)) {
      console.log("Deposit needs approval, initiating approval first");
      pendingDepositAmount.current = depositAmount;
      approve(depositAmount);
      return;
    }
    writeToContract("deposit", [depositAmount]);
  };

  return {
    deposit,
    isLoading: depositLoading || isPending || isConfirming,
    error: depositError ?? error,
    hash,
    isSuccess: isDepositSuccess,
    errorMessage,
  };
}