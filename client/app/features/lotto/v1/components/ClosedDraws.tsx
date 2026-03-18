"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorStateLotto } from "./ErrorStateLotto";
import { EmptyStateLotto } from "./EmptyStateLotto";
import { MILLIS, REFRESH_INTERVAL_MILLIS } from "../../../../helpers";
import { useClaimWinnings } from "../../../prediction/v1/hooks/useClaimWinnings";
import { LOTTO_CLOSED_DRAWS_QUERY_KEY } from "../queries/keys";
import DrawsTable from "./DrawsTable";
import { useQuery } from "../../../prediction/v1/hooks/useQuery";
import { request } from "graphql-request";
import { DEFAULT_HEADERS } from "../../../../queries/headers";
import { getDrawsWithWinnerQuery } from "../queries/lotto";
import { CardTemplate } from "../../../root/v1/components/CardTemplate";
import { useUserTicketCounts } from "@/app/features/lotto/v1/hooks/useUserTicketCounts";
import { useAppKitAccount } from "@reown/appkit/react";
import { useTranslations } from "next-intl";

interface Draw {
  id: string;
  startTime: string;
  ticketPrice: string;
  potSize: string;
  ticketCount: string;
  open: boolean;
  winnerChosen: boolean;
  winner: string | null;
  claimed: boolean;
  closeTime: string | null;
  requestId: string | null;
}

interface WinnerDrawsData {
  draws: Draw[];
}

const ITEMS_PER_PAGE = 10;

export default function ClosedDraws() {
  const t = useTranslations("lotto");
  const queryClient = useQueryClient();
  const { address: userAddress } = useAppKitAccount();
  const [currentPage, setCurrentPage] = useState(0);

  const { data, error, isLoading, isError, refetch } =
    useQuery<WinnerDrawsData>({
      queryKey: [LOTTO_CLOSED_DRAWS_QUERY_KEY, currentPage],
      async queryFn(): Promise<WinnerDrawsData> {
        const result = await request(
          process.env.NEXT_PUBLIC_LOTTO_THE_GRAPH_API_URL!,
          getDrawsWithWinnerQuery,
          { first: ITEMS_PER_PAGE, skip: currentPage * ITEMS_PER_PAGE },
          DEFAULT_HEADERS
        );
        return result as WinnerDrawsData;
      },
      retry: (failureCount, error) => {
        if (error?.message?.includes("fetch")) {
          return failureCount < 2;
        }
        return failureCount < 3;
      },
      staleTime: REFRESH_INTERVAL_MILLIS.medium,
      refetchInterval: REFRESH_INTERVAL_MILLIS.medium,
    });

  // Get draw IDs for user ticket count lookup
  const drawIds = useMemo(
    () => data?.draws.map((draw) => draw.id) ?? [],
    [data?.draws]
  );

  // Fetch user's ticket counts for the displayed draws
  const { ticketCountsByDraw } = useUserTicketCounts(drawIds);

  const onSuccess = useCallback(() => {
    setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: [LOTTO_CLOSED_DRAWS_QUERY_KEY],
      });
    }, 3 * MILLIS.inSecond);
  }, [queryClient]);

  const { claimWinnings } = useClaimWinnings(onSuccess);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    if (data?.draws.length === ITEMS_PER_PAGE) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  if (isLoading) {
    return (
      <CardTemplate
        title={t("closed_draws_title")}
        description={t("closed_draws_loading_description")}
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
        title={t("closed_draws_title")}
        description={t("closed_draws_error_description")}
        isRefreshing={isLoading}
        refresh={refetch}
      >
        <ErrorStateLotto
          title={t("closed_draws_error_title")}
          message={error?.message || t("unknown_error")}
          details={t("closed_draws_error_details")}
        />
      </CardTemplate>
    );
  }

  if (!data?.draws.length) {
    return (
      <CardTemplate
        title={t("closed_draws_title")}
        description={t("closed_draws_description")}
        isRefreshing={isLoading}
        refresh={refetch}
      >
        <EmptyStateLotto
          title={t("closed_draws_empty_title")}
          message={t("closed_draws_empty_message")}
        />
      </CardTemplate>
    );
  }

  return (
    <CardTemplate
      title={t("closed_draws_title")}
      description={t("closed_draws_description")}
      isRefreshing={isLoading}
      refresh={refetch}
    >
      <DrawsTable
        draws={data.draws}
        onClaimWinnings={claimWinnings}
        userAddress={userAddress}
        userTicketCounts={ticketCountsByDraw}
      />
      <CardFooter className="flex flex-col gap-2 sm:gap-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between w-full gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 0 || isLoading}
            className="text-xs sm:text-sm px-2 sm:px-3"
          >
            ← <span className="hidden sm:inline">{t("pagination_previous")}</span>
          </Button>
          <span className="text-[10px] sm:text-xs text-muted-foreground text-center">
            {t("pagination_page", { page: currentPage + 1 })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={data.draws.length < ITEMS_PER_PAGE || isLoading}
            className="text-xs sm:text-sm px-2 sm:px-3"
          >
            <span className="hidden sm:inline">{t("pagination_next")}</span> →
          </Button>
        </div>
        <div className="text-[10px] sm:text-xs text-muted-foreground text-center">
          {t("pagination_showing", {
            start: currentPage * ITEMS_PER_PAGE + 1,
            end: currentPage * ITEMS_PER_PAGE + data.draws.length,
          })}
        </div>
      </CardFooter>
    </CardTemplate>
  );
}
