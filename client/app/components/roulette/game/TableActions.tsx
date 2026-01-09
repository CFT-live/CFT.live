"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertTriangle, XCircle, UserX } from "lucide-react";
import { useReadContract } from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import { ROULETTE_ABI, ROULETTE_ADDRESS } from "@/app/lib/contracts";
import { useCancelTableAfterTimeout } from "@/app/hooks/roulette/useCancelTableAfterTimeout";
import { useEliminateInactivePlayer } from "@/app/hooks/roulette/useEliminateInactivePlayer";
import { AutoClearingAlert } from "../../AutoClearingAlert";
import { Table } from "@/app/queries/roulette.types";
import { ContractButton } from "../../ContractButton";

interface TableActionsProps {
  readonly table: Table;
}

// Constants from contract (in seconds)
const VRF_TIMEOUT_SECONDS = 10 * 60; // 10 minutes
const TURN_TIMEOUT_SECONDS = 10 * 60; // 10 minutes

const TIMEOUT_MINUTES = Math.floor(TURN_TIMEOUT_SECONDS / 60);

// Helper component for turn timeout content
interface TurnTimeoutContentProps {
  turnTimeoutStatus: {
    canEliminate: boolean;
    isCurrentPlayerActiveUser: boolean | "" | undefined;
  };
  onEliminatePlayer: () => void;
  isLoading: boolean;
  errorMessage: string | null | undefined;
}

const TurnTimeoutContent: React.FC<TurnTimeoutContentProps> = ({
  turnTimeoutStatus,
  onEliminatePlayer,
  isLoading,
  errorMessage,
}) => {
  const t = useTranslations("roulette");
  if (!turnTimeoutStatus.canEliminate) {
    return (
      <p className="text-xs text-muted-foreground">
        {turnTimeoutStatus.isCurrentPlayerActiveUser
          ? t("timers_turn_can_be_eliminated_self", { minutes: TIMEOUT_MINUTES })
          : t("timers_turn_can_be_eliminated_other", { minutes: TIMEOUT_MINUTES })}
      </p>
    );
  }

  if (turnTimeoutStatus.isCurrentPlayerActiveUser) {
    return (
      <div className="space-y-2">
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm font-semibold">
            {t("timers_turn_timed_out_self")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Alert className="py-2 border-orange-500 bg-orange-500/5">
        <UserX className="h-4 w-4 text-orange-500" />
        <AlertDescription className="text-sm">
          {t("timers_turn_timed_out_other")}
        </AlertDescription>
      </Alert>
      <ContractButton
        onClick={onEliminatePlayer}
        disabled={isLoading}
        variant="outline"
        className="w-full border-orange-500 text-orange-600 hover:bg-orange-500/10"
        size="sm"
      >
          {isLoading
            ? t("timers_eliminating")
            : t("timers_eliminate_inactive_player")}
      </ContractButton>
      <AutoClearingAlert message={errorMessage} variant="destructive" />
    </div>
  );
};

  export const TableActions: React.FC<TableActionsProps> = ({
    table,
  }: Readonly<TableActionsProps>) => {
    const t = useTranslations("roulette");
  const { address } = useAppKitAccount();
  const [currentTime, setCurrentTime] = useState<number>(() =>
    Math.floor(Date.now() / 1000)
  );

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Read VRF request time from contract
  const { data: tableRequestTime } = useReadContract({
    address: ROULETTE_ADDRESS,
    abi: ROULETTE_ABI,
    functionName: "tableRequestTime",
    args: [BigInt(table.id)],
    query: {
      enabled: table.status === "WaitingRandom",
      refetchInterval: 10000,
    },
  });

  // Read turn start time from contract
  const { data: tableTurnStartTime } = useReadContract({
    address: ROULETTE_ADDRESS,
    abi: ROULETTE_ABI,
    functionName: "tableTurnStartTime",
    args: [BigInt(table.id)],
    query: {
      enabled: table.status === "InProgress",
      refetchInterval: 10000,
    },
  });

  // Hooks for contract interactions
  const cancelTableHook = useCancelTableAfterTimeout();
  const eliminatePlayerHook = useEliminateInactivePlayer();

  // Calculate VRF timeout status
  const vrfTimeoutStatus = useMemo(() => {
    if (table.status !== "WaitingRandom" || !tableRequestTime) {
      return null;
    }
    const requestTime = Number(tableRequestTime);
    const timeoutAt = requestTime + VRF_TIMEOUT_SECONDS;
    const remaining = timeoutAt - currentTime;
    const elapsed = currentTime - requestTime;
    const progress = Math.min((elapsed / VRF_TIMEOUT_SECONDS) * 100, 100);

    return {
      requestTime,
      timeoutAt,
      remaining: Math.max(0, remaining),
      elapsed,
      progress,
      canCancel: remaining <= 0,
    };
  }, [table.status, tableRequestTime, currentTime]);

  // Calculate turn timeout status
  const turnTimeoutStatus = useMemo(() => {
    if (table.status !== "InProgress" || !tableTurnStartTime) {
      return null;
    }
    const turnStartTime = Number(tableTurnStartTime);
    // If turn start time is 0, the game just started
    if (turnStartTime === 0) {
      return null;
    }
    const timeoutAt = turnStartTime + TURN_TIMEOUT_SECONDS;
    const remaining = timeoutAt - currentTime;
    const elapsed = currentTime - turnStartTime;
    const progress = Math.min((elapsed / TURN_TIMEOUT_SECONDS) * 100, 100);

    const currentPlayer = table.players[table.currentPlayerIndex ?? 0];
    const isCurrentPlayerActiveUser = address && currentPlayer?.user.id?.toLowerCase() === address.toLowerCase();

    return {
      turnStartTime,
      timeoutAt,
      remaining: Math.max(0, remaining),
      elapsed,
      progress,
      canEliminate: remaining <= 0,
      currentPlayerAddress: currentPlayer?.user.id,
      isCurrentPlayerActiveUser,
    };
  }, [table.status, tableTurnStartTime, currentTime, table.players, table.currentPlayerIndex, address]);

  // Format time remaining
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Handle cancel table action
  const handleCancelTable = useCallback(() => {
    cancelTableHook.cancelTableAfterTimeout(Number.parseInt(table.id));
  }, [cancelTableHook, table.id]);

  // Handle eliminate inactive player action
  const handleEliminatePlayer = useCallback(() => {
    eliminatePlayerHook.eliminateInactivePlayer(Number.parseInt(table.id));
  }, [eliminatePlayerHook, table.id]);

  // Only render if there's something to show
  if (!vrfTimeoutStatus && !turnTimeoutStatus) {
    return null;
  }

  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-950/55 p-3 sm:p-4 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm sm:text-base font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {t("timers_title")}
        </div>
      </div>

      <div className="mt-3 space-y-4">
        {/* VRF Timeout Section */}
        {vrfTimeoutStatus && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span>{t("timers_waiting_vrf")}</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{t("timers_vrf_timeout")}</span>
                <span
                  className={
                    vrfTimeoutStatus.canCancel
                      ? "text-red-500 font-semibold"
                      : "text-muted-foreground"
                  }
                >
                  {vrfTimeoutStatus.canCancel
                    ? t("timers_timeout_reached")
                    : formatTime(vrfTimeoutStatus.remaining)}
                </span>
              </div>
              <Progress
                value={vrfTimeoutStatus.progress}
                className={`h-2 ${
                  vrfTimeoutStatus.canCancel ? "[&>div]:bg-red-500" : ""
                }`}
              />
            </div>

            {vrfTimeoutStatus.canCancel ? (
              <div className="space-y-2">
                <Alert variant="destructive" className="py-2">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {t("timers_vrf_timed_out")}
                  </AlertDescription>
                </Alert>
                <ContractButton
                  onClick={handleCancelTable}
                  disabled={cancelTableHook.isLoading}
                  variant="destructive"
                  className="w-full"
                  size="sm"
                >
                  {cancelTableHook.isLoading
                    ? t("timers_cancelling")
                    : t("timers_cancel_table_enable_refunds")}
                </ContractButton>
                <AutoClearingAlert
                  message={cancelTableHook.errorMessage}
                  variant="destructive"
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("timers_vrf_explanation", { minutes: TIMEOUT_MINUTES })}
              </p>
            )}
          </div>
        )}

        {/* Turn Timeout Section */}
        {turnTimeoutStatus && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserX className="h-4 w-4 text-orange-500" />
              {turnTimeoutStatus.isCurrentPlayerActiveUser ? (
                <span className="text-orange-500 font-semibold">
                  {t("timers_its_your_turn")}
                </span>
              ) : (
                <span>
                  {t("timers_waiting_for")}{" "}
                  <span className="font-mono text-xs">
                    {turnTimeoutStatus.currentPlayerAddress?.slice(0, 6)}...
                    {turnTimeoutStatus.currentPlayerAddress?.slice(-4)}
                  </span>{" "}
                  {t("timers_to_play")}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{t("timers_turn_timeout")}</span>
                <span
                  className={
                    turnTimeoutStatus.canEliminate
                      ? "text-red-500 font-semibold"
                      : "text-muted-foreground"
                  }
                >
                  {turnTimeoutStatus.canEliminate
                    ? t("timers_timeout_reached")
                    : formatTime(turnTimeoutStatus.remaining)}
                </span>
              </div>
              <Progress
                value={turnTimeoutStatus.progress}
                className={`h-2 ${
                  turnTimeoutStatus.canEliminate ? "[&>div]:bg-orange-500" : ""
                }`}
              />
            </div>

            <TurnTimeoutContent
              turnTimeoutStatus={turnTimeoutStatus}
              onEliminatePlayer={handleEliminatePlayer}
              isLoading={eliminatePlayerHook.isLoading}
              errorMessage={eliminatePlayerHook.errorMessage}
            />
          </div>
        )}
      </div>
    </div>
  );
};
