"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useQueryClient } from "@tanstack/react-query";
import { isAddress } from "viem";
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { AdminSection } from "./AdminSection";
import { useSafeWriteContractRoulette } from "../hooks/useSafeWriteContractRoulette";
import { MILLIS, usdcToWei, weiToUsdcString } from "@/app/helpers";
import { ROULETTE_CONTRACT_METADATA_QUERY_KEY } from "../queries/keys";
import { ContractButton } from "@/app/features/root/v1/components/ContractButton";
import { ROULETTE_ABI, ROULETTE_ADDRESS } from "@/app/lib/contracts";

interface RouletteAdminCardProps {
  readonly contractOwnerAddress: string;
}

export function RouletteAdminCard({
  contractOwnerAddress,
}: Readonly<RouletteAdminCardProps>) {
  const t = useTranslations("roulette");
  const { address: userAddress } = useAppKitAccount();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const isOwner = userAddress?.toLowerCase() === contractOwnerAddress.toLowerCase();
  const {
    data: feePool,
    refetch: refetchFeePool,
    isLoading: isFeePoolLoading,
  } = useReadContract({
    address: ROULETTE_ADDRESS,
    abi: ROULETTE_ABI,
    functionName: "getFeePool",
    account: userAddress as `0x${string}` | undefined,
    query: {
      enabled: Boolean(isOwner && userAddress),
    },
  });

  const refreshAdminData = useCallback(() => {
    setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: [ROULETTE_CONTRACT_METADATA_QUERY_KEY],
      });
      refetchFeePool();
    }, 3 * MILLIS.inSecond);
  }, [queryClient, refetchFeePool]);

  // Set min bet amount
  const [minBetAmount, setMinBetAmount] = useState("");
  const onMinBetSuccess = useCallback(() => {
    setMinBetAmount("");
    refreshAdminData();
  }, [refreshAdminData]);

  const {
    writeToContract: setMinBet,
    isLoading: isMinBetLoading,
    errorMessage: minBetError,
  } = useSafeWriteContractRoulette(onMinBetSuccess);

  const handleSetMinBetAmount = () => {
    const amount = Number.parseFloat(minBetAmount);
    if (Number.isNaN(amount) || amount <= 0) return;
    setMinBet("setMinBetAmount", [usdcToWei(amount)]);
  };

  // Set max bet amount
  const [maxBetAmount, setMaxBetAmount] = useState("");
  const onMaxBetSuccess = useCallback(() => {
    setMaxBetAmount("");
    refreshAdminData();
  }, [refreshAdminData]);

  const {
    writeToContract: setMaxBet,
    isLoading: isMaxBetLoading,
    errorMessage: maxBetError,
  } = useSafeWriteContractRoulette(onMaxBetSuccess);

  const handleSetMaxBetAmount = () => {
    const amount = Number.parseFloat(maxBetAmount);
    if (Number.isNaN(amount) || amount <= 0) return;
    setMaxBet("setMaxBetAmount", [usdcToWei(amount)]);
  };

  // Set callback gas limit
  const [gasLimit, setGasLimit] = useState("");
  const onGasLimitSuccess = useCallback(() => {
    setGasLimit("");
    refreshAdminData();
  }, [refreshAdminData]);

  const {
    writeToContract: setGasLimitValue,
    isLoading: isGasLimitLoading,
    errorMessage: gasLimitError,
  } = useSafeWriteContractRoulette(onGasLimitSuccess);

  const handleSetCallbackGasLimit = () => {
    const limit = Number.parseInt(gasLimit);
    if (Number.isNaN(limit) || limit <= 0) return;
    setGasLimitValue("setCallbackGasLimit", [limit]);
  };

  // Set fee config
  const [feeCollector, setFeeCollector] = useState("");
  const [feeBps, setFeeBps] = useState("");
  const onFeeConfigSuccess = useCallback(() => {
    setFeeCollector("");
    setFeeBps("");
    refreshAdminData();
  }, [refreshAdminData]);

  const {
    mutate: setFeeConfig,
    data: feeConfigHash,
    isPending: isFeeConfigPending,
    error: feeConfigWriteError,
    reset: resetFeeConfig,
  } = useWriteContract();

  const {
    isLoading: isFeeConfigConfirming,
    isSuccess: isFeeConfigSuccess,
  } = useWaitForTransactionReceipt({
    hash: feeConfigHash,
    query: {
      enabled: Boolean(feeConfigHash),
    },
  });

  const isFeeConfigLoading = isFeeConfigPending || isFeeConfigConfirming;
  const feeConfigError = getReadableContractError(
    feeConfigWriteError,
    "Failed to set fee configuration."
  );

  const feeConfigAddress = isAddress(feeCollector)
    ? (feeCollector as `0x${string}`)
    : undefined;

  useEffect(() => {
    if (!isFeeConfigSuccess) {
      return;
    }
    onFeeConfigSuccess();
  }, [isFeeConfigSuccess, onFeeConfigSuccess]);

  const handleSetFeeConfig = () => {
    const parsedFeeBps = Number.parseInt(feeBps, 10);
    if (!feeConfigAddress) return;
    if (Number.isNaN(parsedFeeBps) || parsedFeeBps < 0 || parsedFeeBps > 10000) {
      return;
    }
    resetFeeConfig();
    setFeeConfig({
      address: ROULETTE_ADDRESS,
      abi: ROULETTE_ABI,
      functionName: "setFeeConfig",
      args: [feeConfigAddress, parsedFeeBps],
    });
  };

  const isFeeConfigValid =
    Boolean(feeConfigAddress) &&
    feeBps.length > 0 &&
    Number.parseInt(feeBps, 10) >= 0 &&
    Number.parseInt(feeBps, 10) <= 10000;

  // Withdraw fees
  const onWithdrawSuccess = useCallback(() => {
    refreshAdminData();
  }, [refreshAdminData]);

  const {
    mutate: withdrawFees,
    data: withdrawFeesHash,
    isPending: isWithdrawPending,
    error: withdrawFeesWriteError,
    reset: resetWithdrawFees,
  } = useWriteContract();

  const {
    isLoading: isWithdrawConfirming,
    isSuccess: isWithdrawSuccess,
  } = useWaitForTransactionReceipt({
    hash: withdrawFeesHash,
    query: {
      enabled: Boolean(withdrawFeesHash),
    },
  });

  const isWithdrawing = isWithdrawPending || isWithdrawConfirming;
  const withdrawError = getReadableContractError(
    withdrawFeesWriteError,
    "Failed to withdraw collected fees."
  );

  useEffect(() => {
    if (!isWithdrawSuccess) {
      return;
    }
    onWithdrawSuccess();
  }, [isWithdrawSuccess, onWithdrawSuccess]);

  const handleWithdrawFees = () => {
    resetWithdrawFees();
    withdrawFees({
      address: ROULETTE_ADDRESS,
      abi: ROULETTE_ABI,
      functionName: "withdrawCollectedFees",
    });
  };

  // Pause/Unpause
  const onPauseSuccess = useCallback(() => {
    refreshAdminData();
  }, [refreshAdminData]);

  const {
    writeToContract: togglePause,
    isLoading: isPauseLoading,
    errorMessage: pauseError,
  } = useSafeWriteContractRoulette(onPauseSuccess);

  const handlePause = () => {
    togglePause("pause", []);
  };

  const handleUnpause = () => {
    togglePause("unpause", []);
  };

  // Only show to owner
  if (!isOwner) {
    return null;
  }

  return (
    <Card className="mt-4 sm:mt-6 border-primary">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="bg-primary/10 p-4 sm:p-6">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <div className="text-left">
              <CardTitle className="text-sm sm:text-lg font-bold uppercase tracking-wider flex items-center gap-2">
                <svg
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {t("admin_controls_title")}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t("admin_controls_description")}
              </CardDescription>
            </div>
            <svg
              className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="p-3 sm:p-4 space-y-4 sm:space-y-6">
            {/* Set Min Bet Amount */}
            <AdminSection
              title={t("admin_set_min_title")}
              description={t("admin_set_min_description")}
              errorMessage={minBetError}
            >
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="minBetAmount" className="text-xs">
                    {t("admin_min_bet_label")}
                  </Label>
                  <Input
                    id="minBetAmount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={minBetAmount}
                    onChange={(e) => setMinBetAmount(e.target.value)}
                    placeholder="1.00"
                    disabled={isMinBetLoading}
                  />
                </div>
                <div className="flex items-end">
                  <ContractButton
                    onClick={handleSetMinBetAmount}
                    disabled={isMinBetLoading || !minBetAmount}
                    size="sm"
                  >
                    {isMinBetLoading ? t("common_setting") : t("admin_set_min_button")}
                  </ContractButton>
                </div>
              </div>
            </AdminSection>

            {/* Set Max Bet Amount */}
            <AdminSection
              title={t("admin_set_max_title")}
              description={t("admin_set_max_description")}
              errorMessage={maxBetError}
            >
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="maxBetAmount" className="text-xs">
                    {t("admin_max_bet_label")}
                  </Label>
                  <Input
                    id="maxBetAmount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={maxBetAmount}
                    onChange={(e) => setMaxBetAmount(e.target.value)}
                    placeholder="100.00"
                    disabled={isMaxBetLoading}
                  />
                </div>
                <div className="flex items-end">
                  <ContractButton
                    onClick={handleSetMaxBetAmount}
                    disabled={isMaxBetLoading || !maxBetAmount}
                    size="sm"
                  >
                    {isMaxBetLoading ? t("common_setting") : t("admin_set_max_button")}
                  </ContractButton>
                </div>
              </div>
            </AdminSection>

            {/* Set Callback Gas Limit */}
            <AdminSection
              title={t("admin_set_gas_title")}
              description={t("admin_set_gas_description")}
              errorMessage={gasLimitError}
            >
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="gasLimit" className="text-xs">
                    {t("admin_gas_limit_label")}
                  </Label>
                  <Input
                    id="gasLimit"
                    type="number"
                    min="1"
                    step="1"
                    value={gasLimit}
                    onChange={(e) => setGasLimit(e.target.value)}
                    placeholder="500000"
                    disabled={isGasLimitLoading}
                  />
                </div>
                <div className="flex items-end">
                  <ContractButton
                    onClick={handleSetCallbackGasLimit}
                    disabled={isGasLimitLoading || !gasLimit}
                    size="sm"
                  >
                    {isGasLimitLoading ? t("common_setting") : t("admin_set_gas_button")}
                  </ContractButton>
                </div>
              </div>
            </AdminSection>

            {/* Set Fee Config */}
            <AdminSection
              title="Set Fee Configuration"
              description="Update the fee collector address and fee in basis points. Use 100 for 1% and 10000 for 100%."
              errorMessage={feeConfigError}
            >
              <div className="space-y-3">
                <div>
                  <Label htmlFor="feeCollector" className="text-xs">
                    Fee Collector Address
                  </Label>
                  <Input
                    id="feeCollector"
                    value={feeCollector}
                    onChange={(e) => setFeeCollector(e.target.value)}
                    placeholder="0x..."
                    disabled={isFeeConfigLoading}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="feeBps" className="text-xs">
                      Fee (Basis Points)
                    </Label>
                    <Input
                      id="feeBps"
                      type="number"
                      min="0"
                      max="10000"
                      step="1"
                      value={feeBps}
                      onChange={(e) => setFeeBps(e.target.value)}
                      placeholder="100"
                      disabled={isFeeConfigLoading}
                    />
                  </div>
                  <div className="flex items-end">
                    <ContractButton
                      onClick={handleSetFeeConfig}
                      disabled={isFeeConfigLoading || !isFeeConfigValid}
                      size="sm"
                    >
                      {isFeeConfigLoading ? t("common_setting") : "Set Fee"}
                    </ContractButton>
                  </div>
                </div>
              </div>
            </AdminSection>

            {/* Withdraw Fees */}
            <AdminSection
              title={t("admin_withdraw_title")}
              description={t("admin_withdraw_description")}
              errorMessage={withdrawError}
            >
              <div className="space-y-3">
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Current Fee Pool
                  </p>
                  <p className="text-sm font-semibold sm:text-base">
                    {isFeePoolLoading || feePool === undefined
                      ? "Loading..."
                      : `${weiToUsdcString(feePool)} USDC`}
                  </p>
                </div>

                <ContractButton
                  onClick={handleWithdrawFees}
                  disabled={isWithdrawing}
                  size="sm"
                  variant="default"
                >
                  {isWithdrawing ? t("admin_withdrawing") : t("admin_withdraw_button")}
                </ContractButton>
              </div>
            </AdminSection>

            {/* Pause/Unpause */}
            <AdminSection
              title={t("admin_pause_title")}
              description={t("admin_pause_description")}
              errorMessage={pauseError}
            >
              <div className="flex gap-2">
                <ContractButton
                  onClick={handlePause}
                  disabled={isPauseLoading}
                  size="sm"
                  variant="destructive"
                >
                  {isPauseLoading ? t("admin_pausing") : t("admin_pause_button")}
                </ContractButton>
                <ContractButton
                  onClick={handleUnpause}
                  disabled={isPauseLoading}
                  size="sm"
                  variant="default"
                >
                  {isPauseLoading ? t("admin_unpausing") : t("admin_unpause_button")}
                </ContractButton>
              </div>
            </AdminSection>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function getReadableContractError(
  error: unknown,
  fallbackMessage: string
): string | undefined {
  if (!error) {
    return undefined;
  }

  if (typeof error === "object" && error !== null) {
    const shortMessage =
      "shortMessage" in error && typeof error.shortMessage === "string"
        ? error.shortMessage.trim()
        : "";
    const message =
      "message" in error && typeof error.message === "string"
        ? error.message.trim()
        : "";

    if (shortMessage) {
      return shortMessage;
    }

    if (message) {
      return message.split("\n").slice(0, 2).join(" ");
    }
  }

  return fallbackMessage;
}
