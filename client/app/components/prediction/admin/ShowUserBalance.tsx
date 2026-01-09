"use client";

import { weiToUsdcString } from "@/app/helpers";
import {
  PREDICTION_MARKET_ADDRESS,
  PREDICTION_MARKET_ABI,
} from "@/app/lib/contracts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";

import { useConfig } from "wagmi";
import { readContract } from "wagmi/actions";
import { useAppKitAccount } from "@reown/appkit/react";
import { ContractButton } from "../../ContractButton";

export const ShowUserBalance = ({
  contractOwnerAddress,
}: {
  contractOwnerAddress: string;
}) => {
  const { address } = useAppKitAccount();
  const config = useConfig();

  const [userAddress, setUserAddress] = useState<string | null>("");
  const [userBalance, setUserBalance] = useState<bigint>();

  const isContractOwner =
    address?.toLowerCase() === contractOwnerAddress.toLowerCase();

  if (!isContractOwner) {
    return null;
  }

  const getUserBalance = async () => {
    if (!userAddress) return;
    const bets = await readContract(config, {
      address: PREDICTION_MARKET_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: "getBalance",
      account: address as `0x${string}`,

      args: [userAddress as `0x${string}`],
    });
    setUserBalance(bets);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Show User Balance</CardTitle>
        <CardDescription>
          Enter a user address to view their balance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            value={userAddress || ""}
            onChange={(e) => setUserAddress(e.target.value)}
            placeholder="Enter user address"
          />
          <ContractButton onClick={getUserBalance}>Get User Balance</ContractButton>
        </div>
        {userBalance && (
          <div className="rounded-md border">
            {`User Balance: ${weiToUsdcString(userBalance)}`}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
