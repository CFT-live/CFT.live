"use client";

import { useReadContract } from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  PREDICTION_MARKET_ABI,
  PREDICTION_MARKET_ADDRESS,
} from "../../../../../lib/contracts";
import { useSafeWriteContract } from "../../hooks/useSafeWriteContract";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect } from "react";
import { weiToUsdcString } from "../../../../../helpers";
import { ContractButton } from "../../../../root/v1/components/ContractButton";

export const FeeCollectorInfo = ({
  contractOwnerAddress,
}: {
  contractOwnerAddress: string;
}) => {
  const { address: userAddress } = useAppKitAccount();
  const isOwner =
    userAddress?.toLowerCase() === contractOwnerAddress.toLowerCase();

  const {
    data: feeCollectorAddress,
    refetch: refetchFeeCollectorAddress,
  } = useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: "feeCollector",
    account: userAddress as `0x${string}` | undefined,
    query: { enabled: Boolean(isOwner && userAddress) },
  });

  const {
    data: feePool,
    refetch: refetchFeePool,
    error,
  } = useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: "getFeePool",
    account: userAddress as `0x${string}` | undefined,
    query: { enabled: Boolean(isOwner && userAddress) },
  });

  const { writeToContract, isLoading, isSuccess, errorMessage } =
    useSafeWriteContract();

  const handleCollectFees = () => {
    writeToContract("withdrawCollectedFees");
  };

  useEffect(() => {
    if (isSuccess) {
      refetchFeeCollectorAddress();
      refetchFeePool();
    }
  }, [isSuccess, refetchFeeCollectorAddress, refetchFeePool]);

  if (!isOwner) {
    return null;
  }

  if (error) {
    console.error("Error fetching fee pool:", error);
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center uppercase tracking-wider">
          <svg
            className="w-5 h-5 mr-2 text-primary"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
              clipRule="evenodd"
            />
          </svg>
          Fee Collector Information
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Manage collected fees from the prediction market
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Fee Information Section */}
        <div className="space-y-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold border-b border-border pb-2">
            Fee Details
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <p className="text-muted-foreground text-sm">
                Fee Collector Address
              </p>
              <p className="font-mono text-sm break-all">
                {feeCollectorAddress ?? "Loading..."}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">
                Contract Owner Address
              </p>
              <p className="font-mono text-sm break-all">
                {contractOwnerAddress}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Accumulated Fees</p>
              <p className="font-semibold text-lg">
                {feePool === undefined
                  ? "Loading..."
                  : `${weiToUsdcString(feePool)} USDC`}
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {isSuccess && (
          <Alert className="border-primary bg-primary/10 text-foreground">
            <svg
              className="w-4 h-4 text-primary shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <AlertDescription className="ml-2">
              Fees collected successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {errorMessage && (
          <Alert
            variant="destructive"
            className="border-destructive bg-destructive/10"
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <AlertDescription className="ml-2">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <ContractButton
            onClick={() => {
              refetchFeeCollectorAddress();
              refetchFeePool();
            }}
            variant="outline"
            className="flex-1"
          >
            Refresh Fee Pool
          </ContractButton>
          <ContractButton
            onClick={handleCollectFees}
            disabled={isLoading}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold uppercase tracking-wider"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="-ml-1 mr-3 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Collecting Fees…
              </span>
            ) : (
              "Collect Fees"
            )}
          </ContractButton>
        </div>
      </CardContent>
    </Card>
  );
};
