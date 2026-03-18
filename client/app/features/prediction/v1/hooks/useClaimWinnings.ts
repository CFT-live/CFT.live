import { useCallback } from "react";
import { useSafeWriteContractLotto } from "./useSafeWriteContractLotto";

export function useClaimWinnings(onSuccess?: () => void) {
  const { writeToContract, isLoading, errorMessage, reset } =
    useSafeWriteContractLotto(onSuccess);

  const claimWinnings = useCallback(
    (drawId: string) => {
      writeToContract("claimWinnings", [BigInt(drawId)]);
    },
    [writeToContract]
  );

  return {
    claimWinnings,
    isLoading,
    errorMessage,
    reset,
  };
}
