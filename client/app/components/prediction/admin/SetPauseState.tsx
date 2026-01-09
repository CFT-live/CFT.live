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
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { ContractButton } from "../../ContractButton";

export const SetPauseState = ({
  contractOwnerAddress,
  isPaused,
}: {
  contractOwnerAddress: string;
  isPaused: boolean;
}) => {
  const { address } = useAppKitAccount();
  const queryClient = useQueryClient();

  const onSuccess = useCallback(() => {
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

  const togglePause = (paused: boolean) => {
    writeToContract("setPauseState", [paused]);
  };

  if (!isContractOwner) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pause State</CardTitle>
        <CardDescription>
          Current state: {isPaused ? "PAUSED" : "ACTIVE"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <ContractButton 
            onClick={() => togglePause(true)} 
            disabled={isLoading || isPaused}
            variant="destructive"
          >
            {isLoading ? "Setting..." : "Pause Contract"}
          </ContractButton>
          <ContractButton 
            onClick={() => togglePause(false)} 
            disabled={isLoading || !isPaused}
            variant="default"
          >
            {isLoading ? "Setting..." : "Unpause Contract"}
          </ContractButton>
        </div>
        {errorMessage && <p className="text-red-500">{errorMessage}</p>}
        {isSuccess && <p className="text-green-500">Success!</p>}
      </CardContent>
    </Card>
  );
};
