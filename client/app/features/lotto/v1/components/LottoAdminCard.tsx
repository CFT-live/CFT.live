"use client";

import { useState, useCallback } from "react";
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
import { useReadContract } from "wagmi";
import { AdminSection } from "./AdminSection";
import { useCloseDraw } from "../../../prediction/v1/hooks/useCloseDraw";
import { useSafeWriteContractLotto } from "../../../prediction/v1/hooks/useSafeWriteContractLotto";
import { MILLIS, usdcToWei, weiToUsdcString } from "../../../../helpers";
import { LOTTO_CONTRACT_METADATA_QUERY_KEY } from "../queries/keys";
import { useAppKitAccount } from "@reown/appkit/react";
import { ContractButton } from "../../../root/v1/components/ContractButton";
import { LOTTO_ABI, LOTTO_ADDRESS } from "@/app/lib/contracts";

interface LottoAdminCardProps {
  readonly contractOwnerAddress: string;
}

export function LottoAdminCard({ contractOwnerAddress }: LottoAdminCardProps) {
  const { address: userAddress } = useAppKitAccount();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const isOwner = userAddress?.toLowerCase() === contractOwnerAddress.toLowerCase();
  const {
    data: feePool,
    refetch: refetchFeePool,
    isLoading: isFeePoolLoading,
  } = useReadContract({
    address: LOTTO_ADDRESS,
    abi: LOTTO_ABI,
    functionName: "getFeePool",
    account: userAddress as `0x${string}` | undefined,
    query: {
      enabled: Boolean(isOwner && userAddress),
    },
  });

  const refreshAdminData = useCallback(() => {
    setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: [LOTTO_CONTRACT_METADATA_QUERY_KEY],
      });
      refetchFeePool();
    }, 3 * MILLIS.inSecond);
  }, [queryClient, refetchFeePool]);

  // Close draw
  const onCloseSuccess = useCallback(() => {
    refreshAdminData();
  }, [refreshAdminData]);

  const {
    closeDraw,
    isLoading: isClosing,
    errorMessage: closeError,
  } = useCloseDraw(onCloseSuccess);

  // Set ticket price
  const [ticketPrice, setTicketPrice] = useState("");
  const onPriceSuccess = useCallback(() => {
    setTicketPrice("");
    refreshAdminData();
  }, [refreshAdminData]);

  const {
    writeToContract: setPrice,
    isLoading: isPriceLoading,
    errorMessage: priceError,
  } = useSafeWriteContractLotto(onPriceSuccess);

  const handleSetTicketPrice = () => {
    const price = Number.parseFloat(ticketPrice);
    if (Number.isNaN(price) || price <= 0) return;
    setPrice("setTicketPrice", [usdcToWei(price)]);
  };

  // Set max ticket amount
  const [maxTickets, setMaxTickets] = useState("");
  const onMaxSuccess = useCallback(() => {
    setMaxTickets("");
    refreshAdminData();
  }, [refreshAdminData]);

  const {
    writeToContract: setMaxAmount,
    isLoading: isMaxLoading,
    errorMessage: maxError,
  } = useSafeWriteContractLotto(onMaxSuccess);

  const handleSetMaxTickets = () => {
    const max = Number.parseInt(maxTickets);
    if (Number.isNaN(max) || max <= 0) return;
    setMaxAmount("setMaxTicketAmount", [max]);
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
    writeToContract: setFeeConfig,
    isLoading: isFeeConfigLoading,
    errorMessage: feeConfigError,
  } = useSafeWriteContractLotto(onFeeConfigSuccess);

  const handleSetFeeConfig = () => {
    const parsedFeeBps = Number.parseInt(feeBps, 10);
    if (!isAddress(feeCollector)) return;
    if (Number.isNaN(parsedFeeBps) || parsedFeeBps < 0 || parsedFeeBps > 10000) {
      return;
    }
    setFeeConfig("setFeeConfig", [feeCollector, parsedFeeBps]);
  };

  const isFeeConfigValid =
    isAddress(feeCollector) &&
    feeBps.length > 0 &&
    Number.parseInt(feeBps, 10) >= 0 &&
    Number.parseInt(feeBps, 10) <= 10000;

  // Withdraw fees
  const onWithdrawSuccess = useCallback(() => {
    refreshAdminData();
  }, [refreshAdminData]);

  const {
    writeToContract: withdrawFees,
    isLoading: isWithdrawing,
    errorMessage: withdrawError,
  } = useSafeWriteContractLotto(onWithdrawSuccess);

  const handleWithdrawFees = () => {
    withdrawFees("withdrawCollectedFees", []);
  };

  // Pause/Unpause
  const onPauseSuccess = useCallback(() => {
    refreshAdminData();
  }, [refreshAdminData]);

  const {
    writeToContract: togglePause,
    isLoading: isPauseLoading,
    errorMessage: pauseError,
  } = useSafeWriteContractLotto(onPauseSuccess);

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
        <CardHeader className="bg-primary/10 px-3 sm:px-6 py-3 sm:py-6">
          <CollapsibleTrigger className="flex items-center justify-between w-full gap-2">
            <div className="text-left min-w-0">
              <CardTitle className="text-sm sm:text-lg font-bold uppercase tracking-wider flex items-center gap-1.5 sm:gap-2">
                <svg
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
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
                <span className="truncate">Admin Controls</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Contract owner functions</CardDescription>
            </div>
            <svg
              className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform shrink-0 ${
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
            {/* Close Draw */}
            <AdminSection
              title="Close Current Draw"
              description="Closes the current open draw and requests VRF for winner selection."
              errorMessage={closeError}
            >
              <ContractButton
                onClick={closeDraw}
                disabled={isClosing}
                size="sm"
                variant="default"
              >
                {isClosing ? "Closing..." : "Close Draw"}
              </ContractButton>
            </AdminSection>

            {/* Set Ticket Price */}
            <AdminSection
              title="Set Ticket Price"
              description="Update the ticket price for future draws."
              errorMessage={priceError}
            >
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="ticketPrice" className="text-xs">
                    Price (USDC)
                  </Label>
                  <Input
                    id="ticketPrice"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={ticketPrice}
                    onChange={(e) => setTicketPrice(e.target.value)}
                    placeholder="1.00"
                    disabled={isPriceLoading}
                  />
                </div>
                <div className="flex items-end">
                  <ContractButton
                    onClick={handleSetTicketPrice}
                    disabled={isPriceLoading || !ticketPrice}
                    size="sm"
                  >
                    {isPriceLoading ? "Setting..." : "Set Price"}
                  </ContractButton>
                </div>
              </div>
            </AdminSection>

            {/* Set Max Tickets */}
            <AdminSection
              title="Set Max Tickets Per Purchase"
              description="Maximum number of tickets a user can buy in one transaction."
              errorMessage={maxError}
            >
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="maxTickets" className="text-xs">
                    Max Tickets
                  </Label>
                  <Input
                    id="maxTickets"
                    type="number"
                    min="1"
                    step="1"
                    value={maxTickets}
                    onChange={(e) => setMaxTickets(e.target.value)}
                    placeholder="100"
                    disabled={isMaxLoading}
                  />
                </div>
                <div className="flex items-end">
                  <ContractButton
                    onClick={handleSetMaxTickets}
                    disabled={isMaxLoading || !maxTickets}
                    size="sm"
                  >
                    {isMaxLoading ? "Setting..." : "Set Max"}
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
                      {isFeeConfigLoading ? "Setting..." : "Set Fee"}
                    </ContractButton>
                  </div>
                </div>
              </div>
            </AdminSection>

            {/* Withdraw Fees */}
            <AdminSection
              title="Withdraw Collected Fees"
              description="Withdraw accumulated fees to the fee collector address."
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
                  {isWithdrawing ? "Withdrawing..." : "Withdraw Fees"}
                </ContractButton>
              </div>
            </AdminSection>

            {/* Pause/Unpause */}
            <AdminSection
              title="Pause/Unpause Contract"
              description="Emergency pause to prevent new ticket purchases."
              errorMessage={pauseError}
            >
              <div className="flex gap-2">
                <ContractButton
                  onClick={handlePause}
                  disabled={isPauseLoading}
                  size="sm"
                  variant="destructive"
                >
                  {isPauseLoading ? "Pausing..." : "Pause"}
                </ContractButton>
                <ContractButton
                  onClick={handleUnpause}
                  disabled={isPauseLoading}
                  size="sm"
                  variant="default"
                >
                  {isPauseLoading ? "Unpausing..." : "Unpause"}
                </ContractButton>
              </div>
            </AdminSection>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
