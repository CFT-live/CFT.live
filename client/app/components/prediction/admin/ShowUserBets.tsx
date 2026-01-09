"use client";

import { readContract } from "wagmi/actions";
import { useConfig } from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  PREDICTION_MARKET_ABI,
  PREDICTION_MARKET_ADDRESS,
} from "../../../lib/contracts";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { weiToUsdcString } from "../../../helpers";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ContractButton } from "../../ContractButton";

export const ShowUserBets = ({
  contractOwnerAddress,
}: {
  contractOwnerAddress: string;
}) => {
  const { address } = useAppKitAccount();
  const config = useConfig();

  const [userAddress, setUserAddress] = useState<string | null>("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userBets, setUserBets] = useState<any[]>([]);

  const isContractOwner =
    address?.toLowerCase() === contractOwnerAddress.toLowerCase();

  if (!isContractOwner) {
    return null;
  }

  const getUserBets = async () => {
    if (!userAddress) return;
    const bets = await readContract(config, {
      address: PREDICTION_MARKET_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: "getAllBetsForUser",
      account: address as `0x${string}`,

      args: [userAddress as `0x${string}`],
    });
    console.log("User Bets:", bets);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setUserBets(bets as any[]);
  };

  // Renders a input field for the address and button for fetching user bets
  return (
    <Card>
      <CardHeader>
        <CardTitle>Show User Bets</CardTitle>
        <CardDescription>
          Enter a user address to view their bets.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            value={userAddress || ""}
            onChange={(e) => setUserAddress(e.target.value)}
            placeholder="Enter user address"
          />
          <ContractButton onClick={getUserBets}>Get User Bets</ContractButton>
        </div>
        {userBets.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Round ID</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Claimed</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userBets.map((bet, index) => (
                  <TableRow key={index}>
                    <TableCell>{bet.roundId.toString()}</TableCell>
                    <TableCell>{bet.position}</TableCell>
                    <TableCell>${weiToUsdcString(bet.amount.toString())}</TableCell>
                    <TableCell>{bet.claimed ? "Yes" : "No"}</TableCell>
                    <TableCell>{bet.user}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
