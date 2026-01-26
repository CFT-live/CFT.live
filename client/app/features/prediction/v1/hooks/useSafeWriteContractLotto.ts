import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useSimulateContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  LOTTO_ABI,
  LOTTO_ADDRESS,
} from "../../../../lib/contracts";
import { useGraphStatus } from "../../../../providers/GraphStatusProvider";
import { useWalletConfirmation } from "../../../../providers/WalletConfirmationProvider";

export function useSafeWriteContractLotto(onSuccess?: () => void) {
  const { address: userAddress, isConnected } = useAppKitAccount();
  const [functionName, setFunctionName] = useState<string | undefined>();
  const [args, setArgs] = useState<unknown[] | undefined>();
  const onSuccessRef = useRef(onSuccess);
  const { reportTransactionBlock } = useGraphStatus();
  const { beginWalletConfirmation, endWalletConfirmation } =
    useWalletConfirmation();
  const walletConfirmationIdRef = useRef<string | null>(null);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const clearWalletConfirmation = useCallback(() => {
    const id = walletConfirmationIdRef.current;
    if (!id) return;
    endWalletConfirmation(id);
    walletConfirmationIdRef.current = null;
  }, [endWalletConfirmation]);

  const clearSimulationInputs = useCallback(() => {
    setFunctionName(undefined);
    setArgs(undefined);
  }, []);

  const {
    data: simulateData,
    error: simulateError,
    isLoading: isSimulating,
  } = useSimulateContract({
    abi: LOTTO_ABI,
    address: LOTTO_ADDRESS,
    account: userAddress as `0x${string}` | undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    functionName: functionName as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: args as any,
    query: {
      enabled: Boolean(functionName && isConnected && userAddress),
      retry: false,
    },
  });

  const {
    mutate,
    data: hash,
    isPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess,
  } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: Boolean(hash),
    },
  });

  // Public function to initiate transaction
  const writeToContract = useCallback(
    (fn: string, fnArgs: unknown[] = []) => {
      // Set function name and args to trigger simulation
      resetWrite();
      clearWalletConfirmation();
      setFunctionName(fn);
      setArgs(fnArgs);
    },
    [resetWrite, clearWalletConfirmation]
  );

  // Reset state
  const reset = useCallback(() => {
    clearWalletConfirmation();
    clearSimulationInputs();
  }, [clearWalletConfirmation, clearSimulationInputs]);

  useEffect(() => {
    if (hash) {
      clearWalletConfirmation();
    }
  }, [hash, clearWalletConfirmation]);

  useEffect(() => {
    if (writeError) {
      clearWalletConfirmation();
    }
  }, [writeError, clearWalletConfirmation]);

  useEffect(() => {
    if (isSuccess && receipt?.blockNumber) {
      reportTransactionBlock(receipt.blockNumber, "lotto");
      onSuccessRef.current?.();
    }
  }, [isSuccess, receipt?.blockNumber, reportTransactionBlock]);

  // Auto-execute write when simulation completes successfully
  useEffect(() => {
    if (simulateData?.request && !simulateError && !isPending && !hash) {
      console.log("Auto-executing write after successful simulation");
      clearWalletConfirmation();
      walletConfirmationIdRef.current = beginWalletConfirmation(
        "Confirm lotto transaction in your wallet…"
      );
      mutate(simulateData.request, {
        onError: clearWalletConfirmation,
        onSuccess: clearWalletConfirmation,
      });
      clearSimulationInputs();
    }
  }, [
    simulateData,
    simulateError,
    isPending,
    hash,
    mutate,
    beginWalletConfirmation,
    clearWalletConfirmation,
    clearSimulationInputs,
  ]);

  // Create user-friendly error messages
  const uiError = useMemo(() => {
    if (simulateError) {
      return `Simulation failed: ${shortenError(simulateError.message)}`;
    }
    if (writeError) {
      return `Transaction failed: ${shortenError(writeError.message)}`;
    }
  }, [simulateError, writeError]);

  return {
    writeToContract,
    isSuccess,
    isLoading: isSimulating || isPending || isConfirming,
    errorMessage: uiError,
    hash,
    canExecute: Boolean(simulateData?.request && !simulateError),
    error: simulateError ?? writeError,
    reset,
  };
}

// Helper function to shorten error messages
const shortenError = (message: string) => {
  if (message.includes("User rejected") || message.includes("User denied")) {
    return "Transaction cancelled by user.";
  }

  if (message.includes("NotEnoughBalance") || message.includes("InsufficientBalance")) {
    return "Insufficient funds to complete the transaction.";
  }

  if (message.includes("DrawNotOpen")) {
    return "The draw is not accepting tickets.";
  }

  if (message.includes("DrawNotClosed")) {
    return "The draw is still open or not ready.";
  }

  if (message.includes("WinnerNotChosen")) {
    return "Winner has not been selected yet.";
  }

  if (message.includes("NotWinner")) {
    return "You are not the winner of this draw.";
  }

  if (message.includes("AlreadyClaimed")) {
    return "Prize has already been claimed.";
  }

  if (message.includes("EnforcedPause")) {
    return "The lottery is temporarily paused.";
  }

  if (message.includes("Transaction does not have a transaction hash")) {
    return "Unable to confirm transaction hash. Most likely the transaction was still mined, but the confirmation response was not received. Please check your wallet or transaction history.";
  }

  // Extract the two first lines for other errors
  const firstLine = message.split("\n").slice(0, 2).join(" ");
  console.log(message);
  return firstLine;
};
