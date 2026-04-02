"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutoClearingAlert } from "../../../root/v1/components/AutoClearingAlert";
import type { Position } from "../../../../types";
import type { DepositAndBetStep } from "../hooks/useDepositAndBet";

interface BetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roundId: string | null;
  initialPosition: Position | null;
  initialAmount?: string | null;
  isLoading: boolean;
  errorMessage: string | undefined;
  onConfirm: (roundId: string, position: Position, betAmount: string) => void;
  onCancel: () => void;
  contractBalance?: string | null;
  flowStep?: DepositAndBetStep;
  flowTotalSteps?: number;
  flowCurrentStep?: number;
}

export function BetDialog({
  open,
  onOpenChange,
  roundId,
  initialPosition,
  initialAmount,
  isLoading,
  errorMessage,
  onConfirm,
  onCancel,
  contractBalance,
  flowStep = "idle",
  flowTotalSteps = 1,
  flowCurrentStep = 0,
}: Readonly<BetDialogProps>) {
  const t = useTranslations("prediction");
  const [betAmount, setBetAmount] = useState(() => {
    if (initialAmount) return initialAmount;
    if (globalThis.window !== undefined) {
      return globalThis.localStorage.getItem("prediction_last_bet_amount") ?? "1";
    }
    return "1";
  });
  const [position, setPosition] = useState<Position | null>(initialPosition);
  const prevOpenRef = useRef(open);

  // Sync position/amount when dialog transitions from closed → open
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setPosition(initialPosition);
      if (initialAmount) setBetAmount(initialAmount);
    }
    prevOpenRef.current = open;
  }, [open, initialPosition, initialAmount]);

  const handleSetBetAmount = (val: string) => {
    setBetAmount(val);
    if (globalThis.window !== undefined) {
      globalThis.localStorage.setItem("prediction_last_bet_amount", val);
    }
  };

  const handleConfirm = () => {
    if (!position || !roundId || !betAmount) return;
    const amount = Number.parseFloat(betAmount);
    if (Number.isNaN(amount) || amount <= 0) return;
    if (globalThis.window !== undefined) {
      globalThis.localStorage.setItem("prediction_last_bet_amount", betAmount);
    }
    onConfirm(roundId, position, betAmount);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("rounds.bet_dialog.title", {
              position:
                position === "UP"
                  ? t("rounds.positions.up_with_arrow")
                  : t("rounds.positions.down_with_arrow"),
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              position === "UP"
                ? "rounds.bet_dialog.description_up"
                : "rounds.bet_dialog.description_down"
            )}{" "}
            {t("rounds.bet_dialog.round_id", {
              roundId: roundId ?? "-",
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="betAmount">
                {t("rounds.bet_dialog.amount_label")}
              </Label>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {t("rounds.bet_dialog.quick_amounts")}
              </span>
            </div>
            <div className="flex gap-1.5 mb-1.5">
              {["1", "5", "10", "25", "50"].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleSetBetAmount(val)}
                  disabled={isLoading}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                    betAmount === val
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  ${val}
                </button>
              ))}
            </div>
            <Input
              id="betAmount"
              type="number"
              min="1"
              step="1"
              value={betAmount}
              onChange={(e) => handleSetBetAmount(e.target.value)}
              placeholder={t("rounds.bet_dialog.amount_placeholder")}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("rounds.bet_dialog.position_label")}</Label>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant={position === "UP" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setPosition("UP")}
                disabled={isLoading}
              >
                {t("rounds.positions.up_with_arrow")}
              </Button>
              <Button
                type="button"
                variant={position === "DOWN" ? "destructive" : "outline"}
                className="flex-1"
                onClick={() => setPosition("DOWN")}
                disabled={isLoading}
              >
                {t("rounds.positions.down_with_arrow")}
              </Button>
            </div>
          </div>

          <AutoClearingAlert message={errorMessage} variant="destructive" />

          {/* Contract balance + auto-topup info */}
          {contractBalance != null && (
            <div className="rounded border border-border px-3 py-2 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("rounds.bet_dialog.your_balance")}
                </span>
                <span className="font-mono font-medium">
                  ${contractBalance} USDC
                </span>
              </div>
              {Number.parseFloat(betAmount || "0") >
                Number.parseFloat(contractBalance) && (
                <p className="text-primary text-[11px]">
                  {t("rounds.bet_dialog.auto_topup")}
                </p>
              )}
            </div>
          )}

          {/* Step-based progress when multi-step flow is active */}
          {isLoading && flowTotalSteps > 1 && (
            <div className="space-y-2">
              <div className="flex gap-1">
                {Array.from({ length: flowTotalSteps }).map((_, i) => {
                  const getStepClass = () => {
                    if (i < flowCurrentStep) return "bg-primary";
                    if (i === flowCurrentStep - 1) return "bg-primary animate-pulse";
                    return "bg-muted";
                  };
                  return (
                    <div
                      key={`step-${flowTotalSteps}-${i}`}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${getStepClass()}`}
                    />
                  );
                })}
              </div>
              <Alert className="border-primary bg-accent">
                <AlertDescription>
                  <strong className="font-semibold text-sm">
                    {t("rounds.bet_dialog.step_progress", {
                      current: flowCurrentStep,
                      total: flowTotalSteps,
                    })}
                    {" — "}
                    {flowStep === "approving" && t("rounds.bet_dialog.step_approving")}
                    {flowStep === "depositing" && t("rounds.bet_dialog.step_depositing")}
                    {flowStep === "betting" && t("rounds.bet_dialog.step_betting")}
                  </strong>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("rounds.bet_dialog.processing_description")}
                  </p>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Single-step processing indicator */}
          {isLoading && flowTotalSteps <= 1 && (
            <Alert className="border-primary bg-accent">
              <AlertDescription>
                <strong className="font-semibold">
                  {t("rounds.bet_dialog.processing_title")}
                </strong>
                <p className="mt-1 text-sm">
                  {t("rounds.bet_dialog.processing_description")}
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} onClick={onCancel}>
            {t("rounds.bet_dialog.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={
              isLoading ||
              !betAmount ||
              !position ||
              Number.parseFloat(betAmount) <= 0
            }
          >
            {isLoading
              ? t("rounds.bet_dialog.processing")
              : t("rounds.bet_dialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
