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
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { ContractButton } from "../../../../root/v1/components/ContractButton";

export const SetMaxOpenRoundsPerUser = ({
  contractOwnerAddress,
}: {
  contractOwnerAddress: string;
}) => {
  const { address } = useAppKitAccount();
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState<string>("");

  const onSuccess = useCallback(() => {
    setInputValue("");
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
    writeToContract("setMaxOpenRoundsPerUser", [Number(inputValue)]);
  };

  if (!isContractOwner) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Max Open Rounds Per User</CardTitle>
        <CardDescription>
          Maximum number of open rounds a user can create.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter max open rounds per user"
            disabled={isLoading}
          />
          <ContractButton onClick={setValue} disabled={isLoading}>
            {isLoading ? "Setting..." : "Set value"}
          </ContractButton>
        </div>
        {errorMessage && <p className="text-red-500">{errorMessage}</p>}
        {isSuccess && <p className="text-green-500">Success!</p>}
      </CardContent>
    </Card>
  );
};
