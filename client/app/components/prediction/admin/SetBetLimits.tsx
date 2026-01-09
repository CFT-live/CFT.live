"use client";

import { MILLIS } from "@/app/helpers";
import { useSafeWriteContract } from "@/app/hooks/useSafeWriteContract";
import { CONTRACT_METADATA_QUERY_KEY } from "@/app/queries/keys";
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
import { ContractButton } from "../../ContractButton";

export const SetBetLimits = ({
  contractOwnerAddress,
}: {
  contractOwnerAddress: string;
}) => {
  const { address } = useAppKitAccount();
  const queryClient = useQueryClient();

  const [minBetAmount, setMinBetAmount] = useState<string>("");
  const [maxBetAmount, setMaxBetAmount] = useState<string>("");

  const onSuccess = useCallback(() => {
    setMinBetAmount("");
    setMaxBetAmount("");
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
    writeToContract("setBetLimits", [
      Number(minBetAmount),
      Number(maxBetAmount),
    ]);
  };

  if (!isContractOwner) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bet Limits</CardTitle>
        <CardDescription>
          Set minimum and maximum bet amounts (in token units).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-4">
          <div>
            <Label htmlFor="minBet">Minimum Bet Amount</Label>
            <Input
              id="minBet"
              value={minBetAmount}
              onChange={(e) => setMinBetAmount(e.target.value)}
              placeholder="Enter min bet amount"
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="maxBet">Maximum Bet Amount</Label>
            <Input
              id="maxBet"
              value={maxBetAmount}
              onChange={(e) => setMaxBetAmount(e.target.value)}
              placeholder="Enter max bet amount"
              disabled={isLoading}
            />
          </div>
          <ContractButton onClick={setValue} disabled={isLoading} className="w-full">
            {isLoading ? "Setting..." : "Set bet limits"}
          </ContractButton>
        </div>
        {errorMessage && <p className="text-red-500">{errorMessage}</p>}
        {isSuccess && <p className="text-green-500">Success!</p>}
      </CardContent>
    </Card>
  );
};
