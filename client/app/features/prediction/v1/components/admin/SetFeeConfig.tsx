"use client";

import { MILLIS } from "@/app/helpers";
import { useSafeWriteContract } from "@/app/features/prediction/v1/hooks/useSafeWriteContract";
import { CONTRACT_METADATA_QUERY_KEY } from "../../queries/keys";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { ContractButton } from "../../../../root/v1/components/ContractButton";

export const SetFeeConfig = ({
  contractOwnerAddress,
}: {
  contractOwnerAddress: string;
}) => {
  const { address } = useAppKitAccount();
  const queryClient = useQueryClient();
  const [feeCollector, setFeeCollector] = useState<string>("");
  const [feeBps, setFeeBps] = useState<string>("");

  const onSuccess = useCallback(() => {
    setFeeCollector("");
    setFeeBps("");
    setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: [CONTRACT_METADATA_QUERY_KEY],
      });
    }, 3 * MILLIS.inSecond);
  }, [queryClient]);

  const { writeToContract, isLoading, isSuccess, errorMessage } =
    useSafeWriteContract(onSuccess);

  const isContractOwner =
    address?.toLowerCase() === contractOwnerAddress.toLowerCase();

  const setValue = () => {
    writeToContract("setFeeConfig", [feeCollector, Number(feeBps)]);
  };

  if (!isContractOwner) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee Configuration</CardTitle>
        <CardDescription>
          Set fee collector address and fee in basis points (100 = 1%, max 10000 = 100%).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-4">
          <div>
            <Label htmlFor="feeCollector">Fee Collector Address</Label>
            <Input
              id="feeCollector"
              value={feeCollector}
              onChange={(e) => setFeeCollector(e.target.value)}
              placeholder="0x..."
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="feeBps">Fee (Basis Points)</Label>
            <Input
              id="feeBps"
              value={feeBps}
              onChange={(e) => setFeeBps(e.target.value)}
              placeholder="Enter fee in bps (e.g., 100 for 1%)"
              disabled={isLoading}
            />
          </div>
          <ContractButton onClick={setValue} disabled={isLoading} className="w-full">
            {isLoading ? "Setting..." : "Set fee config"}
          </ContractButton>
        </div>
        {errorMessage && <p className="text-red-500">{errorMessage}</p>}
        {isSuccess && <p className="text-green-500">Success!</p>}
      </CardContent>
    </Card>
  );
};
