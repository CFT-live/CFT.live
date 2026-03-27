"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AlertCircle, CheckCircle, Clock, Trophy, LogOut, AlertTriangle, RefreshCcw, ChevronDown, Flag, Crosshair } from "lucide-react";
import { usdcToWei, weiToUsdc } from "@/app/helpers";
import { useReadContract, useWriteContract } from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import { cn } from "@/lib/utils";

// Import hooks
import { useJoinTable } from "@/app/features/roulette/v1/hooks/useJoinTable";
import { useLeaveTable } from "@/app/features/roulette/v1/hooks/useLeaveTable";
import { useMarkReady } from "@/app/features/roulette/v1/hooks/useMarkReady";
import { usePlayTurn } from "@/app/features/roulette/v1/hooks/usePlayTurn";
import { useClaimWinnings } from "@/app/features/roulette/v1/hooks/useClaimWinnings";
import { useClaimRefund } from "@/app/features/roulette/v1/hooks/useClaimRefund";
import { AllowanceWarning } from "@/app/features/root/v1/components/AllowanceWarning";
import { AutoClearingAlert } from "@/app/features/root/v1/components/AutoClearingAlert";
import { erc20Abi, ROULETTE_ADDRESS, USDC_ADDRESS } from "@/app/lib/contracts";
import { maxUint256 } from "viem";
import { Table, TablePlayer } from "@/app/features/roulette/v1/queries/roulette.types";
import { ContractButton } from "@/app/features/root/v1/components/ContractButton";

interface GameControlsProps {
  readonly table: Table;
  readonly isParticipant: boolean;
  readonly isCurrentPlayer: boolean;
  readonly userPlayer: TablePlayer | null | undefined;
}

export const GameControls: React.FC<GameControlsProps> = ({
  table,
  isParticipant,
  isCurrentPlayer,
  userPlayer,
}: Readonly<GameControlsProps>) => {
  const t = useTranslations("roulette");
  const { address } = useAppKitAccount();
  const [betAmount, setBetAmount] = useState<string>(table.currentBetAmount ? weiToUsdc(table.currentBetAmount).toString() : "");
  const [selectedRandom, setSelectedRandom] = useState<number | null>(null);
  const [showAllowanceWarning, setShowAllowanceWarning] = useState(false);

  // Hooks for contract interactions
  const joinTableHook = useJoinTable();
  const leaveTableHook = useLeaveTable();
  const markReadyHook = useMarkReady();
  const playTurnHook = usePlayTurn();
  const claimWinningsHook = useClaimWinnings();
  const claimRefundHook = useClaimRefund();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address as `0x${string}`, ROULETTE_ADDRESS] : undefined,
    query: { enabled: Boolean(address) },
  });

  const {
    mutate,
    isPending,
    data: allowanceUpdateHash,
  } = useWriteContract();

  const requestUnlimitedAllowance = () => {
    if (isPending) return;
    const value = maxUint256;
    mutate({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [ROULETTE_ADDRESS, value],
    });
  };

  useEffect(() => {
    if (allowance !== undefined) {
      const allowanceNumber = Number(allowance);
      const amountNumber = Number(usdcToWei(betAmount || "0"));
      setShowAllowanceWarning(allowanceNumber < amountNumber);
    }
  }, [allowance, betAmount]);

  useEffect(() => {
    if (allowanceUpdateHash) {
      refetchAllowance();
    }
  }, [allowanceUpdateHash, refetchAllowance]);

  const isWinner = useMemo(() => {
    if (!table || !address) return false;
    return table.winner?.toLowerCase() === address.toLowerCase();
  }, [table, address]);

  // Check if user can claim refund (no winner + user has played amount)
  const canClaimRefund = useMemo(() => {
    if (!address || !isParticipant || !userPlayer) return false;
    // Can claim refund if: table is finished, no winner (all dead or cancelled), and user has bet something
    if (table.status !== "Finished" && table.status !== "Cancelled") return false;
    if (table.winner) return false; // There's a winner, no refunds
    const userBetAmount = BigInt(userPlayer.totalBetAmount ?? "0");
    return userBetAmount > BigInt(0);
  }, [address, isParticipant, userPlayer, table]);

  // Check if table was cancelled
  const isTableCancelled = useMemo(() => {
    return table.status === "Cancelled" || (table.status === "Finished" && table.cancelReason);
  }, [table]);

  // Bet amount validation
  const minBet = table ? weiToUsdc(table.currentBetAmount) : 0;
  const maxBet = table
    ? weiToUsdc(BigInt(table.currentBetAmount) + BigInt(table.maxIncrement))
    : 0;

  const isBetValid = useMemo(() => {
    const betNum = Number.parseFloat(betAmount);
    return !Number.isNaN(betNum) && betNum >= minBet && betNum <= maxBet;
  }, [betAmount, minBet, maxBet]);

  // Handle actions
  const handleJoinTable = () => {
    joinTableHook.joinTable(Number.parseInt(table.id));
  };

  const handleLeaveTable = () => {
    leaveTableHook.leaveTable(Number.parseInt(table.id));
  };

  const handleMarkReady = () => {
    markReadyHook.markReady(Number.parseInt(table.id));
  };

  const handlePlayTurn = () => {
    if (!isBetValid || selectedRandom === null) return;
    playTurnHook.playTurn(
      Number.parseInt(table.id),
      Number.parseFloat(betAmount),
      selectedRandom
    );
  };

  const handleClaimWinnings = () => {
    claimWinningsHook.claimWinnings(Number.parseInt(table.id));
  };

  const handleClaimRefund = () => {
    claimRefundHook.claimRefund(Number.parseInt(table.id));
  };

  const panelTitle = useMemo(() => {
    if (table.status === "Open") return t("game_controls_panel_join");
    if (table.status === "InProgress" || table.status === "WaitingRandom") {
      return t("game_controls_panel_actions");
    }
    if (table.status === "Finished" || table.status === "Cancelled") {
      return t("game_controls_panel_payout");
    }
    return t("game_controls_panel_controls");
  }, [table.status, t]);

  const renderPreGameControls = () => {
    if (table.status !== "Open") return null;

    return (
      <div className="space-y-3">
          {!address && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                {t("game_controls_connect_wallet_to_join")}
              </AlertDescription>
            </Alert>
          )}

          {address && !isParticipant && (
            <>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t("game_controls_table_players", {
                  current: table.players.length,
                  max: table.maxPlayers,
                })}
              </p>
              <ContractButton
                onClick={handleJoinTable}
                disabled={
                  joinTableHook.isLoading ||
                  table.players.length >= table.maxPlayers
                }
                className="w-full"
              >
                {joinTableHook.isLoading
                  ? t("game_controls_joining")
                  : t("game_controls_join_table")}
              </ContractButton>
              {table.players.length >= table.maxPlayers && (
                <p className="text-xs sm:text-sm text-red-500">
                  {t("game_controls_table_full")}
                </p>
              )}
              <AutoClearingAlert
                message={joinTableHook.errorMessage}
                variant="destructive"
              />
            </>
          )}

          {address && isParticipant && (
            <>
              {!userPlayer?.isReady && (
                <>
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs sm:text-sm">
                      {t("game_controls_joined_table")}{" "}
                      {table.players.length < 2
                        ? t("game_controls_waiting_more_players")
                        : t("game_controls_mark_ready_to_start")}
                    </AlertDescription>
                  </Alert>
                  <ContractButton
                    onClick={handleMarkReady}
                    disabled={
                      markReadyHook.isLoading || table.players.length < 2
                    }
                    className="w-full"
                  >
                    {markReadyHook.isLoading
                      ? t("game_controls_marking_ready")
                      : t("game_controls_mark_ready")}
                  </ContractButton>
                  <AutoClearingAlert
                    message={markReadyHook.errorMessage}
                    variant="destructive"
                  />
                </>
              )}
              {userPlayer?.isReady && (
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-600 text-xs sm:text-sm">
                    {t("game_controls_ready_waiting_others")}
                  </AlertDescription>
                </Alert>
              )}
              <ContractButton
                onClick={handleLeaveTable}
                disabled={leaveTableHook.isLoading}
                variant="destructive"
                className="w-full"
              >
                {leaveTableHook.isLoading
                  ? t("game_controls_leaving")
                  : t("game_controls_leave_table")}
              </ContractButton>
            </>
          )}
      </div>
    );
  };

  const renderInGameControls = () => {
    if (
      (table.status !== "InProgress" && table.status !== "WaitingRandom") ||
      !isParticipant
    ) {
      return null;
    }

    // User is eliminated
    if (userPlayer?.status === "Dead") {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-red-500">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            {t("game_controls_eliminated_title")}
          </div>
            <Alert variant="destructive">
              <AlertDescription className="text-xs sm:text-sm">
                {t("game_controls_eliminated_message")}
              </AlertDescription>
            </Alert>
        </div>
      );
    }

    return (
      <div className="space-y-4">
          {table.status === "WaitingRandom" && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                {t("game_controls_waiting_random")}
              </AlertDescription>
            </Alert>
          )}

          {table.status !== "WaitingRandom" && !isCurrentPlayer && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                {t("game_controls_waiting_for_turn", {
                  player:
                    table.players[table.currentPlayerIndex ?? 0].user.id.slice(0, 6) +
                    "...",
                })}
              </AlertDescription>
            </Alert>
          )}

          {table.status !== "WaitingRandom" && isCurrentPlayer && (
            <>
              {/* Bet Amount */}
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">
                  {t("game_controls_bet_amount_label")}
                </Label>
                <Input
                  type="number"
                  placeholder={t("game_controls_bet_placeholder", {
                    min: minBet.toFixed(2),
                    max: maxBet.toFixed(2),
                  })}
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  min={minBet}
                  max={maxBet}
                  step="0.01"
                  className="text-sm sm:text-base"
                />
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {t("game_controls_bet_range", {
                    min: minBet.toFixed(2),
                    max: maxBet.toFixed(2),
                  })}
                </p>
              </div>

              {/* Random Number Selection - Chamber Grid */}
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm flex items-center gap-1.5">
                  <Crosshair className="h-3.5 w-3.5 text-primary" />
                  {t("game_controls_select_number")}
                </Label>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSelectedRandom(num)}
                      className={cn(
                        "relative w-full aspect-square rounded-full border-2 font-bold text-sm sm:text-base transition-all duration-200 flex items-center justify-center",
                        selectedRandom === num
                          ? "border-primary bg-primary/20 text-primary animate-chamber-glow scale-110"
                          : "border-zinc-600/50 bg-zinc-900/50 text-zinc-400 hover:border-primary/50 hover:text-primary/80 hover:scale-105"
                      )}
                    >
                      {num}
                      {selectedRandom === num && (
                        <span className="absolute inset-0 rounded-full border border-primary/30 animate-ping pointer-events-none" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <AllowanceWarning
                isVisible={showAllowanceWarning}
                requestUnlimitedAllowance={requestUnlimitedAllowance}
                isPending={isPending}
              />
              <ContractButton
                onClick={handlePlayTurn}
                disabled={
                  !isBetValid ||
                  selectedRandom === null ||
                  playTurnHook.isLoading
                }
                className="w-full text-base sm:text-lg py-3 sm:py-4 font-bold uppercase tracking-wider shadow-[0_0_20px_hsl(23_100%_50%/0.25)] hover:shadow-[0_0_30px_hsl(23_100%_50%/0.4)] transition-shadow"
                size="lg"
              >
                {playTurnHook.isLoading
                  ? t("game_controls_playing")
                  : t("game_controls_play_turn")}
              </ContractButton>
              <AutoClearingAlert
                message={playTurnHook.errorMessage}
                variant="destructive"
              />
              {!isBetValid && betAmount && (
                <p className="text-xs sm:text-sm text-red-500">
                  {t("game_controls_invalid_bet")}
                </p>
              )}
            </>
          )}

          {/* Leave Table during game - forfeit option */}
          <Collapsible className="pt-3 border-t border-border/40">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-muted-foreground hover:text-foreground"
              >
                <span className="text-xs sm:text-sm">
                  {t("game_controls_leave_table")}
                </span>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <Alert className="border-yellow-500 bg-yellow-500/5">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-xs sm:text-sm">
                  {t("game_controls_forfeit_warning")}
                </AlertDescription>
              </Alert>
              <ContractButton
                onClick={handleLeaveTable}
                disabled={leaveTableHook.isLoading}
                variant="outline"
                className="w-full border-red-500/50 text-red-600 hover:bg-red-500/10"
                size="sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {leaveTableHook.isLoading
                  ? t("game_controls_leaving")
                  : t("game_controls_forfeit_and_leave")}
              </ContractButton>
              <AutoClearingAlert
                message={leaveTableHook.errorMessage}
                variant="destructive"
              />
            </CollapsibleContent>
          </Collapsible>
      </div>
    );
  };

  const renderPostGameControls = () => {
    if ((table.status !== "Finished" && table.status !== "Cancelled") || !address) return null;

    // Check if user has already claimed their payout
    const userPayout = table.payouts?.find(
      (p) => p.user.id.toLowerCase() === address.toLowerCase()
    );
    const hasClaimedPayout = Boolean(userPayout);

    // Determine title content
    const getTitleContent = () => {
      if (isTableCancelled) {
        return (
          <>
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
            {t("game_controls_table_cancelled_title")}
          </>
        );
      }
      if (isWinner) {
        return (
          <>
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
            {t("game_controls_you_won_title")}
          </>
        );
      }
      return (
        <>
          <Flag className="h-4 w-4 sm:h-5 sm:w-5" />
          {t("game_controls_game_finished_title")}
        </>
      );
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm sm:text-base font-semibold">
          {getTitleContent()}
        </div>
          {/* Show cancel reason if available */}
          {isTableCancelled && table.cancelReason && (
            <Alert className="border-yellow-500 bg-yellow-500/5">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-xs sm:text-sm">
                {t("game_controls_cancel_reason", { reason: table.cancelReason })}
              </AlertDescription>
            </Alert>
          )}

          {/* Winner claim winnings */}
          {isWinner && !table.payoutClaimed && (
            <>
              <Alert className="border-green-500 bg-green-500/5">
                <Trophy className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-600 font-semibold text-xs sm:text-sm">
                  {t("game_controls_congrats_claim_winnings")}
                </AlertDescription>
              </Alert>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t("game_controls_total_pot", {
                  amount: weiToUsdc(table.totalPool).toFixed(2),
                })}
              </p>
              <ContractButton
                onClick={handleClaimWinnings}
                disabled={claimWinningsHook.isLoading}
                className="w-full"
                size="default"
              >
                {claimWinningsHook.isLoading
                  ? t("game_controls_claiming")
                  : t("game_controls_claim_winnings")}
              </ContractButton>
              <AutoClearingAlert
                message={claimWinningsHook.errorMessage}
                variant="destructive"
              />
            </>
          )}

          {/* Refund available (no winner - all dead or cancelled) */}
          {canClaimRefund && !hasClaimedPayout && (
            <>
              <Alert className="border-blue-500 bg-blue-500/5">
                <RefreshCcw className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-xs sm:text-sm">
                  {isTableCancelled
                    ? t("game_controls_refund_cancelled")
                    : t("game_controls_refund_all_eliminated")}
                </AlertDescription>
              </Alert>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t("game_controls_your_total_bets", {
                  amount: weiToUsdc(userPlayer?.totalBetAmount ?? "0").toFixed(2),
                })}
              </p>
              <ContractButton
                onClick={handleClaimRefund}
                disabled={claimRefundHook.isLoading}
                variant="secondary"
                className="w-full"
              >
                {claimRefundHook.isLoading
                  ? t("game_controls_claiming")
                  : t("game_controls_claim_refund")}
              </ContractButton>
              <AutoClearingAlert
                message={claimRefundHook.errorMessage}
                variant="destructive"
              />
            </>
          )}

          {/* Payout already claimed */}
          {hasClaimedPayout && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-600 text-xs sm:text-sm">
                {t("game_controls_claimed_amount", {
                  amount: weiToUsdc(userPayout?.amount ?? "0").toFixed(2),
                  type: userPayout?.isRefund
                    ? t("payout_type_refund")
                    : t("payout_type_winnings"),
                })}
              </AlertDescription>
            </Alert>
          )}

          {/* Winner claimed (for other participants to see) */}
          {table.payoutClaimed && !isParticipant && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-600 text-xs sm:text-sm">
                {t("game_controls_winnings_claimed")}
              </AlertDescription>
            </Alert>
          )}

          {/* Not eligible for anything */}
          {!isWinner && !canClaimRefund && !hasClaimedPayout && isParticipant && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                {table.winner
                  ? t("game_controls_eliminated_better_luck")
                  : t("game_controls_no_refund")}
              </AlertDescription>
            </Alert>
          )}
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-950/55 p-3 sm:p-4 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm sm:text-base font-semibold">{panelTitle}</div>
        <div className="text-[10px] sm:text-xs text-muted-foreground">
          {table.status}
        </div>
      </div>
      <div className="mt-3">
        {renderPreGameControls()}
        {renderInGameControls()}
        {renderPostGameControls()}
      </div>
    </div>
  );
};
