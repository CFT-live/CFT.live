import { useCallback } from "react";
import { useSafeWriteContractLotto } from "./useSafeWriteContractLotto";

export function useCloseDraw(onSuccess?: () => void) {
  const { writeToContract, isLoading, errorMessage, reset } =
    useSafeWriteContractLotto(onSuccess);

  const closeDraw = useCallback(() => {
    writeToContract("closeDraw", []);
  }, [writeToContract]);

  return {
    closeDraw,
    isLoading,
    errorMessage,
    reset,
  };
}
