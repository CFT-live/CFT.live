"use client";

import { useState, useEffect } from "react";
import { useReadContract, useWriteContract } from "wagmi";
import { maxUint256 } from "viem";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { erc20Abi, LOTTO_ADDRESS, USDC_ADDRESS } from "@/app/lib/contracts";
import { usdcToWei } from "@/app/helpers";
import { AutoClearingAlert } from "../../../root/v1/components/AutoClearingAlert";
import { useAppKitAccount } from "@reown/appkit/react";
import { ContractButton } from "../../../root/v1/components/ContractButton";
import { useTranslations } from "next-intl";

interface BuyTicketsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drawId: string;
  ticketPrice: number;
  onBuyTickets: (amount: number, total: bigint) => void;
  isLoading: boolean;
  errorMessage: string | undefined;
  onReset: () => void;
}

export function BuyTicketsDialog({
  open,
  onOpenChange,
  drawId,
  ticketPrice,
  onBuyTickets,
  isLoading,
  errorMessage,
  onReset,
}: Readonly<BuyTicketsDialogProps>) {
  const t = useTranslations("lotto");
  const { address: userAddress } = useAppKitAccount();
  const [ticketAmount, setTicketAmount] = useState("1");

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: userAddress ? [userAddress as `0x${string}`, LOTTO_ADDRESS] : undefined,
    query: { enabled: Boolean(userAddress) },
  });

  const {
    mutate,
    isPending: isApprovePending,
    data: allowanceUpdateHash,
  } = useWriteContract();

  useEffect(() => {
    if (allowanceUpdateHash) {
      refetchAllowance();
    }
  }, [allowanceUpdateHash, refetchAllowance]);

  const confirmBuy = () => {
    if (!ticketAmount) return;

    const amount = Number.parseFloat(ticketAmount);
    if (Number.isNaN(amount) || amount <= 0) return;

    const totalInUSDC = ticketPrice * amount;
    const totalInWei = usdcToWei(totalInUSDC);
    onBuyTickets(amount, totalInWei);
  };

  const requestUnlimitedAllowance = () => {
    if (isApprovePending) return;
    mutate({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [LOTTO_ADDRESS, maxUint256],
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    setTicketAmount("1");
    onReset();
  };

  const showAllowanceWarning = () => {
    if (allowance !== undefined && ticketAmount) {
      const amountNum = Number.parseFloat(ticketAmount);
      const total = ticketPrice * amountNum;
      const required = usdcToWei(total.toString());
      return allowance < required;
    }
    return false;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("buy_dialog_title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("buy_dialog_description", { drawId })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ticketAmount">
              {t("buy_dialog_ticket_amount_label", {
                price: ticketPrice.toFixed(2),
              })}
            </Label>
            <Input
              id="ticketAmount"
              type="number"
              min="1"
              step="1"
              value={ticketAmount}
              onChange={(e) => setTicketAmount(e.target.value)}
              placeholder={t("buy_dialog_ticket_amount_placeholder")}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              {t("buy_dialog_total_cost", {
                cost: (Number.parseFloat(ticketAmount || "0") * ticketPrice).toFixed(2),
              })}
            </p>
          </div>
          <AutoClearingAlert message={errorMessage} variant="destructive" />
          {isLoading && (
            <Alert className="border-primary bg-accent">
              <AlertDescription>
                <strong className="font-semibold">
                  {t("buy_dialog_processing_title")}
                </strong>
                <p className="mt-1 text-sm">
                  {t("buy_dialog_processing_body")}
                </p>
              </AlertDescription>
            </Alert>
          )}

          {showAllowanceWarning() && (
            <Alert className="border-border bg-accent">
              <AlertDescription>
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.516 9.798c.75 1.334-.213 3.003-1.742 3.003H4.483c-1.53 0-2.493-1.67-1.743-3.003l5.517-9.798zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-8a1 1 0 00-.993.883L9 6v4a1 1 0 001.993.117L11 10V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm mb-2">
                      {t("buy_dialog_allowance_warning")}
                    </p>
                    <ContractButton
                      onClick={requestUnlimitedAllowance}
                      disabled={isApprovePending}
                      variant="outline"
                      size="sm"
                    >
                      {isApprovePending
                        ? t("buy_dialog_approving")
                        : t("buy_dialog_set_unlimited_allowance")}
                    </ContractButton>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} onClick={handleClose}>
            {t("common_cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              confirmBuy();
            }}
            disabled={
              isLoading || !ticketAmount || Number.parseFloat(ticketAmount) <= 0
            }
          >
            {isLoading ? t("common_processing") : t("buy_dialog_confirm_purchase")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
