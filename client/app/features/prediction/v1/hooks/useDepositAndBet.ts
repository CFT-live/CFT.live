import { useCallback, useEffect, useRef, useState } from "react";
import {
  erc20Abi,
  PREDICTION_MARKET_ABI,
  PREDICTION_MARKET_ADDRESS,
  USDC_ADDRESS,
} from "@/app/lib/contracts";
import {
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
  useConfig,
} from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import { readContract } from "wagmi/actions";
import { useSafeWriteContract } from "./useSafeWriteContract";
import { POSITION_ENUM, usdcToWei } from "../../../../helpers";
import type { Position } from "../../../../types";

export type DepositAndBetStep =
  | "idle"
  | "approving"
  | "depositing"
  | "betting"
  | "done";

interface DepositAndBetState {
  step: DepositAndBetStep;
  totalSteps: number;
  currentStepNumber: number;
}

export function useDepositAndBet(onSuccess?: () => void) {
  const { address } = useAppKitAccount();
  const config = useConfig();
  const [flowState, setFlowState] = useState<DepositAndBetState>({
    step: "idle",
    totalSteps: 1,
    currentStepNumber: 0,
  });

  // Pending flow data
  const pendingBetRef = useRef<{
    roundId: string;
    position: Position;
    amount: bigint;
  } | null>(null);
  const pendingDepositAmountRef = useRef<bigint | null>(null);

  // --- Approval step ---
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address
      ? [address as `0x${string}`, PREDICTION_MARKET_ADDRESS]
      : undefined,
    query: { enabled: Boolean(address) },
  });

  const {
    mutate: approveWrite,
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  const { isSuccess: isApproveConfirmed, isLoading: isApproveConfirming } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // --- Deposit step (uses useSafeWriteContract for simulation+execution) ---
  const onDepositSuccess = useCallback(() => {
    // After deposit succeeds, proceed to betting
    if (!pendingBetRef.current) return;
    setFlowState((prev) => ({
      ...prev,
      step: "betting",
      currentStepNumber: prev.totalSteps,
    }));
    const { roundId, position, amount } = pendingBetRef.current;
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    betWrite("placeBet", [roundId, POSITION_ENUM[position], amount]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    writeToContract: depositWrite,
    isLoading: isDepositLoading,
    errorMessage: depositErrorMessage,
    reset: resetDeposit,
  } = useSafeWriteContract(onDepositSuccess);

  // --- Bet step ---
  const onBetSuccess = useCallback(() => {
    pendingBetRef.current = null;
    pendingDepositAmountRef.current = null;
    setFlowState({ step: "done", totalSteps: 1, currentStepNumber: 0 });
    onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSuccess]);

  const {
    writeToContract: betWrite,
    isLoading: isBetLoading,
    errorMessage: betErrorMessage,
    reset: resetBet,
  } = useSafeWriteContract(onBetSuccess);

  // --- After approval confirmed, proceed to deposit ---
  useEffect(() => {
    if (isApproveConfirmed && pendingDepositAmountRef.current) {
      refetchAllowance().then(() => {
        const depositAmount = pendingDepositAmountRef.current;
        if (depositAmount) {
          setFlowState((prev) => ({
            ...prev,
            step: "depositing",
            currentStepNumber: prev.currentStepNumber + 1,
          }));
          depositWrite("deposit", [depositAmount]);
        }
      });
    }
  }, [isApproveConfirmed, refetchAllowance, depositWrite]);

  // --- Main entry point ---
  const depositAndBet = useCallback(
    async (roundId: string, position: Position, betAmountUsdc: string) => {
      const amount = usdcToWei(betAmountUsdc);
      pendingBetRef.current = { roundId, position, amount };

      // Read current contract balance for this user
      let balance = BigInt(0);
      if (address) {
        try {
          balance = (await readContract(config, {
            address: PREDICTION_MARKET_ADDRESS,
            abi: PREDICTION_MARKET_ABI,
            functionName: "getUserBalance",
            account: address as `0x${string}`,
            args: [],
          })) as bigint;
        } catch {
          balance = BigInt(0);
        }
      }

      if (balance >= amount) {
        // Sufficient balance — just bet (1 step)
        setFlowState({ step: "betting", totalSteps: 1, currentStepNumber: 1 });
        betWrite("placeBet", [roundId, POSITION_ENUM[position], amount]);
        return;
      }

      // Need to deposit the deficit
      const deficit = amount - balance;
      pendingDepositAmountRef.current = deficit;

      // Check allowance
      const currentAllowance = allowance ?? BigInt(0);
      if (currentAllowance < deficit) {
        // Need approval → deposit → bet (3 steps)
        setFlowState({
          step: "approving",
          totalSteps: 3,
          currentStepNumber: 1,
        });
        approveWrite({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: "approve",
          args: [PREDICTION_MARKET_ADDRESS, deficit],
        });
      } else {
        // Allowance OK → deposit → bet (2 steps)
        setFlowState({
          step: "depositing",
          totalSteps: 2,
          currentStepNumber: 1,
        });
        depositWrite("deposit", [deficit]);
      }
    },
    [address, config, allowance, betWrite, depositWrite, approveWrite]
  );

  const reset = useCallback(() => {
    pendingBetRef.current = null;
    pendingDepositAmountRef.current = null;
    setFlowState({ step: "idle", totalSteps: 1, currentStepNumber: 0 });
    resetApprove();
    resetDeposit();
    resetBet();
  }, [resetApprove, resetDeposit, resetBet]);

  const isLoading =
    isApprovePending ||
    isApproveConfirming ||
    isDepositLoading ||
    isBetLoading;

  const errorMessage =
    (approveError ? `Approval failed: ${approveError.message.split("\n")[0]}` : undefined) ??
    depositErrorMessage ??
    betErrorMessage;

  return {
    depositAndBet,
    isLoading,
    errorMessage,
    flowState,
    reset,
  };
}
