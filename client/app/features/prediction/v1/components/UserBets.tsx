"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { request } from "graphql-request";
import { useAppKitAccount } from "@reown/appkit/react";
import { getUserLastBets } from "../queries/predictionMarket";
import { DEFAULT_HEADERS } from "../../../../queries/headers";
import { useSafeWriteContract } from "../hooks/useSafeWriteContract";
import { CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { isBetClaimable, MILLIS, REFRESH_INTERVAL_MILLIS } from "../../../../helpers";
import {
  CONTRACT_BALANCE_QUERY_KEY,
  USER_BETS_QUERY_KEY,
} from "../queries/keys";
import { BetRow, BetCard } from "./BetRow";
import { useQuery } from "../hooks/useQuery";
import { Bet } from "../../../../types";
import { CardTemplate } from "../../../root/v1/components/CardTemplate";
import { AutoClearingAlert } from "../../../root/v1/components/AutoClearingAlert";

interface UserBetsData {
  bets: Bet[];
}

export const UserBets = () => {
  const { address } = useAppKitAccount();
  const queryClient = useQueryClient();

  const onSuccess = useCallback(() => {
    setTimeout(() => {
      console.log("Claim successful, refetching data...");
      // Claiming affects balance, user bets, and potentially closed rounds stats
      queryClient.invalidateQueries({
        queryKey: [CONTRACT_BALANCE_QUERY_KEY],
      });
      queryClient.invalidateQueries({ queryKey: [USER_BETS_QUERY_KEY] });
    }, 3 * MILLIS.inSecond);
  }, [queryClient]);

  const {
    writeToContract,
    isLoading: claimLoading,
    errorMessage: claimError,
  } = useSafeWriteContract(onSuccess);

  // Only fetch data if address is available
  const { data, error, isLoading, isError, refetch } = useQuery<UserBetsData>({
    queryKey: [USER_BETS_QUERY_KEY, address?.toLowerCase()],
    async queryFn(): Promise<UserBetsData> {
      if (!address) {
        return { bets: [] };
      }

      try {
        const result = await request(
          process.env.NEXT_PUBLIC_THE_GRAPH_API_URL!,
          getUserLastBets,
          {
            user: address.toLowerCase(),
            first: 50,
          },
          DEFAULT_HEADERS
        );
        return result as UserBetsData;
      } catch (err) {
        console.error("User bets request failed:", err);
        throw err;
      }
    },
    enabled: !!address,
    staleTime: REFRESH_INTERVAL_MILLIS.medium,
    refetchInterval: REFRESH_INTERVAL_MILLIS.medium,
  });

  const claimWinnings = () => {
    const unClaimedBets = data?.bets
      .filter(isBetClaimable)
      .map((bet) => BigInt(bet.id));

    if (!unClaimedBets || unClaimedBets.length === 0) {
      console.log("No unclaimed winning bets found");
      return;
    }
    console.log("Unclaimed winning bets IDs:", unClaimedBets);

    writeToContract("claim", [unClaimedBets]);
  };

  // Return empty if no address
  if (!address) {
    return null;
  }

  if (isLoading) {
    return (
      <CardTemplate
        title="Your Bets"
        description="Loading your betting history..."
        isRefreshing={true}
        refresh={refetch}
      >
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </CardTemplate>
    );
  }

  if (isError) {
    return (
      <CardTemplate
        title="Your Bets"
        description="Error loading data"
        isRefreshing={isLoading}
        refresh={refetch}
      >
        <ErrorState
          title="Error Loading Your Bets"
          message={error?.message || "Unknown error"}
          details="Unable to fetch your bet history. Please check your connection or try again later."
        />
      </CardTemplate>
    );
  }

  if (!data?.bets?.length) {
    return (
      <CardTemplate
        title="Your Bets"
        description="Your betting history and current positions"
        isRefreshing={isLoading}
        refresh={refetch}
      >
        <EmptyState
          title="No Bets Found"
          message="You haven't placed any bets yet. Start by betting on open rounds above!"
        />
      </CardTemplate>
    );
  }

  return (
    <CardTemplate
      title="Your Bets"
      description="Your betting history and current positions"
      isRefreshing={isLoading}
      refresh={refetch}
    >
      <AutoClearingAlert message={claimError} variant="destructive" />

      {/* Desktop View */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Round ID</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Round outcome</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Profit/Loss</TableHead>
              <TableHead>Payout</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.bets.map((bet) => (
              <BetRow
                key={bet.id}
                bet={bet}
                claimLoading={claimLoading}
                claimWinnings={claimWinnings}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {data.bets.map((bet) => (
          <BetCard
            key={bet.id}
            bet={bet}
            claimLoading={claimLoading}
            claimWinnings={claimWinnings}
          />
        ))}
      </div>

      <CardFooter className="text-xs text-muted-foreground mt-4 px-0">
        Showing your most recent {data.bets.length} bets.
        {data.bets.some((bet) => bet.isWinner && !bet.claimed) && (
          <span className="text-primary font-bold ml-2 inline-flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            You have unclaimed winnings!
          </span>
        )}
      </CardFooter>
    </CardTemplate>
  );
};
