import { useCallback } from "react";
import { useSafeWriteContractLotto } from "./useSafeWriteContractLotto";

export function useClaimRefund(onSuccess?: () => void) {
  const { writeToContract, isLoading, errorMessage, reset } =
    useSafeWriteContractLotto(onSuccess);

  const claimRefund = useCallback(
    (drawId: string) => {
      writeToContract("claimRefund", [BigInt(drawId)]);
    },
    [writeToContract]
  );

  return {
    claimRefund,
    isLoading,
    errorMessage,
    reset,
  };
}
