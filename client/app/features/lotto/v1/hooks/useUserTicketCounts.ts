"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import { request } from "graphql-request";
import { DEFAULT_HEADERS } from "@/app/queries/headers";
import { getUserTicketsByDrawsQuery } from "@/app/features/lotto/v1/queries/lotto";
import { LOTTO_USER_TICKETS_QUERY_KEY } from "../queries/keys";
import { useQuery } from "@/app/features/prediction/v1/hooks/useQuery";
import { REFRESH_INTERVAL_MILLIS } from "@/app/helpers";

interface TicketPurchase {
  id: string;
  draw: {
    id: string;
  };
  amount: string;
}

interface UserTicketsData {
  ticketPurchases: TicketPurchase[];
}

export type UserTicketCountMap = Record<string, bigint>;

export function useUserTicketCounts(drawIds: string[]) {
  const { address } = useAppKitAccount();

  const { data, isLoading, error } = useQuery<UserTicketsData>({
    queryKey: [LOTTO_USER_TICKETS_QUERY_KEY, address, drawIds],
    async queryFn(): Promise<UserTicketsData> {
      if (!address || drawIds.length === 0) {
        return { ticketPurchases: [] };
      }
      const result = await request(
        process.env.NEXT_PUBLIC_LOTTO_THE_GRAPH_API_URL!,
        getUserTicketsByDrawsQuery,
        { user: address.toLowerCase(), drawIds },
        DEFAULT_HEADERS
      );
      return result as UserTicketsData;
    },
    enabled: !!address && drawIds.length > 0,
    staleTime: REFRESH_INTERVAL_MILLIS.medium,
    refetchInterval: REFRESH_INTERVAL_MILLIS.medium,
  });

  // Aggregate ticket counts by draw ID
  const ticketCountsByDraw: UserTicketCountMap = {};
  
  if (data?.ticketPurchases) {
    for (const purchase of data.ticketPurchases) {
      const drawId = purchase.draw.id;
      const amount = BigInt(purchase.amount);
      ticketCountsByDraw[drawId] = (ticketCountsByDraw[drawId] || BigInt(0)) + amount;
    }
  }

  return {
    ticketCountsByDraw,
    isLoading,
    error,
  };
}
