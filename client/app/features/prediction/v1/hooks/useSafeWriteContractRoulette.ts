import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useSimulateContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  ROULETTE_ABI,
  ROULETTE_ADDRESS,
} from "../../../../lib/contracts";
import { useGraphStatus } from "../../../../providers/GraphStatusProvider";
import { useWalletConfirmation } from "../../../../providers/WalletConfirmationProvider";

export function useSafeWriteContractRoulette(onSuccess?: () => void) {
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
    abi: ROULETTE_ABI,
    address: ROULETTE_ADDRESS,
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
    resetWrite();
    clearWalletConfirmation();
    clearSimulationInputs();
  }, [resetWrite, clearWalletConfirmation, clearSimulationInputs]);

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
      reportTransactionBlock(receipt.blockNumber, "roulette");
      onSuccessRef.current?.();
    }
  }, [isSuccess, receipt?.blockNumber, reportTransactionBlock]);

  const canAutoExecuteWrite = useMemo(() => {
    return Boolean(simulateData?.request) && !simulateError && !isPending && !hash;
  }, [simulateData?.request, simulateError, isPending, hash]);

  const executeWrite = useCallback(() => {
    if (!simulateData?.request) return;
    console.log("Auto-executing write after successful simulation");
    clearWalletConfirmation();
    walletConfirmationIdRef.current = beginWalletConfirmation(
      "Confirm roulette transaction in your wallet…"
    );
    mutate(simulateData.request as never, {
      onError: clearWalletConfirmation,
      onSuccess: clearWalletConfirmation,
    });
    clearSimulationInputs();
  }, [
    beginWalletConfirmation,
    clearWalletConfirmation,
    clearSimulationInputs,
    mutate,
    simulateData?.request,
  ]);

  // Auto-execute write when simulation completes successfully
  useEffect(() => {
    if (!canAutoExecuteWrite) return;
    executeWrite();
  }, [canAutoExecuteWrite, executeWrite]);

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

type ErrorPattern = {
  needles: string[];
  uiMessage: string;
};

const ERROR_PATTERNS: ErrorPattern[] = [
  {
    needles: ["User rejected", "User denied"],
    uiMessage: "Transaction cancelled by user.",
  },
  {
    needles: ["NotEnoughBalance", "InsufficientBalance"],
    uiMessage: "Insufficient funds to complete the transaction.",
  },
  { needles: ["TableNotFound"], uiMessage: "Table not found." },
  {
    needles: ["TableNotOpen"],
    uiMessage: "Table is not open for joining.",
  },
  { needles: ["TableNotInProgress"], uiMessage: "Game is not in progress." },
  { needles: ["TableNotFinished"], uiMessage: "Game has not finished yet." },
  {
    needles: ["AlreadyInTable"],
    uiMessage: "You have already joined this table.",
  },
  { needles: ["NotInTable"], uiMessage: "You are not in this table." },
  { needles: ["TableFull"], uiMessage: "Table is full." },
  { needles: ["InvalidBetAmount"], uiMessage: "Invalid bet amount." },
  { needles: ["NotPlayerTurn"], uiMessage: "It's not your turn." },
  {
    needles: ["InvalidMaxPlayers"],
    uiMessage: "Invalid number of maximum players (must be 2-10).",
  },
  { needles: ["NotWinner"], uiMessage: "You are not the winner of this table." },
  {
    needles: ["AlreadyClaimed"],
    uiMessage: "Winnings have already been claimed.",
  },
  { needles: ["NoRefundAvailable"], uiMessage: "No refund available." },
  {
    needles: ["VRFTimeoutNotReached"],
    uiMessage:
      "VRF timeout has not been reached yet. Please wait for the full timeout period.",
  },
  {
    needles: ["VRFAlreadyFulfilled"],
    uiMessage: "The random number has already been received. No need to cancel.",
  },
  {
    needles: ["TurnTimeoutNotReached"],
    uiMessage:
      "Turn timeout has not been reached yet. The player still has time to play.",
  },
  {
    needles: ["TableNotWaitingRandom"],
    uiMessage: "Table is not waiting for a random number.",
  },
  {
    needles: ["PlayerAlreadyLeft"],
    uiMessage: "You have already left or been eliminated from this table.",
  },
  {
    needles: ["NotEnoughPlayers"],
    uiMessage: "Not enough players to start the game.",
  },
  {
    needles: ["EnforcedPause"],
    uiMessage: "The contract is temporarily paused.",
  },
  {
    needles: ["Transaction does not have a transaction hash"],
    uiMessage:
      "Unable to confirm transaction hash. Most likely the transaction was still mined, but the confirmation response was not received. Please check your wallet or transaction history.",
  },
];

// Helper function to shorten error messages
const shortenError = (message: string) => {
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.needles.some((needle) => message.includes(needle))) {
      return pattern.uiMessage;
    }
  }

  // Extract the two first lines for other errors
  const firstLine = message.split("\n").slice(0, 2).join(" ");
  console.log(message);
  return firstLine;
};
