import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useSimulateContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  PREDICTION_MARKET_ABI,
  PREDICTION_MARKET_ADDRESS,
} from "../../../../lib/contracts";
import { useGraphStatus } from "../../../../providers/GraphStatusProvider";
import { useWalletConfirmation } from "../../../../providers/WalletConfirmationProvider";

export function useSafeWriteContract(onSuccess?: () => void) {
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
    abi: PREDICTION_MARKET_ABI,
    address: PREDICTION_MARKET_ADDRESS,
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
      reportTransactionBlock(receipt.blockNumber, "prediction");
      onSuccessRef.current?.();
    }
  }, [isSuccess, receipt?.blockNumber, reportTransactionBlock]);

  // Auto-execute write when simulation completes successfully
  useEffect(() => {
    if (simulateData?.request && !simulateError && !isPending && !hash) {
      console.log("Auto-executing write after successful simulation");
      clearWalletConfirmation();
      walletConfirmationIdRef.current = beginWalletConfirmation(
        "Confirm prediction transaction in your wallet…"
      );
      mutate(simulateData.request as never, {
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
    blockNumber: receipt?.blockNumber,
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

  if (message.includes("NotEnoughBalance")) {
    return "Insufficient funds to complete the transaction.";
  }

  if (message.includes("RoundNotOpen")) {
    return "The round is not accepting more bets.";
  }

  if (message.includes("GamePaused")) {
    return "The game is temporarily paused.";
  }

    if (message.includes("InvalidRoundTimes")) {
    return "The specified round times are invalid, please check Starting and Closing times and try again.";
  }

  if (message.includes("Transaction does not have a transaction hash")) {
    return "Unable to confirm transaction hash. Most likely the transaction was still mined, but the confirmation response was not received. Please check your wallet or transaction history.";
  }

  // Extract the two first lines for other errors
  const firstLine = message.split("\n").slice(0, 2).join(" ");
  console.log(message);
  return firstLine;
};
