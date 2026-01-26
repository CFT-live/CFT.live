"use client";

import { useTranslations } from "next-intl";
import { request } from "graphql-request";

import { DEFAULT_HEADERS } from "../../../../queries/headers";
import { getLiveRoundsQuery } from "../queries/predictionMarket";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { LIVE_ROUNDS_QUERY_KEY } from "../queries/keys";
import { useQuery } from "../hooks/useQuery";
import { CardTemplate } from "../../../root/v1/components/CardTemplate";
import { REFRESH_INTERVAL_MILLIS } from "../../../../helpers";
import { Round } from "../../../../types";
import RoundsTable from "./RoundsTable";
import { useState } from "react";

interface LiveRoundsData {
  rounds: Round[];
}

const ITEMS_PER_PAGE = 10;

export default function LiveRounds() {
  const t = useTranslations("prediction");
  const [currentPage, setCurrentPage] = useState(0);
  const { data, error, isLoading, isError, refetch } = useQuery<LiveRoundsData>(
    {
      queryKey: [LIVE_ROUNDS_QUERY_KEY, currentPage],
      async queryFn(): Promise<LiveRoundsData> {
        try {
          const result = await request(
            process.env.NEXT_PUBLIC_THE_GRAPH_API_URL!,
            getLiveRoundsQuery,
            { first: ITEMS_PER_PAGE, skip: currentPage * ITEMS_PER_PAGE },
            DEFAULT_HEADERS
          );
          return result as LiveRoundsData;
        } catch (err) {
          console.error(t("rounds.errors.live_request_failed"), err);
          if (err instanceof Error) {
            throw new Error(
              t("rounds.errors.graphql_error", { message: err.message })
            );
          }
          throw err;
        }
      },
      retry: (failureCount, error) => {
        if (error?.message?.includes("fetch")) {
          return failureCount < 2;
        }
        return failureCount < 3;
      },
      staleTime: REFRESH_INTERVAL_MILLIS.medium,
      refetchInterval: REFRESH_INTERVAL_MILLIS.medium,
    }
  );

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    if (data?.rounds.length === ITEMS_PER_PAGE) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  if (isLoading) {
    return (
      <CardTemplate
        title={t("rounds.titles.live")}
        description={t("rounds.loading.live")}
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
        title={t("rounds.titles.live")}
        description={t("rounds.loading.error_loading_data")}
        isRefreshing={isLoading}
        refresh={refetch}
      >
        <ErrorState
          title={t("rounds.errors.live_title")}
          message={error?.message || t("rounds.errors.unknown_error")}
          details={t("rounds.errors.live_details")}
        />
      </CardTemplate>
    );
  }

  if (!data?.rounds?.length) {
    return (
      <CardTemplate
        title={t("rounds.titles.live")}
        description={t("rounds.descriptions.live")}
        isRefreshing={isLoading}
        refresh={refetch}
      >
        <EmptyState
          title={t("rounds.empty.live_title")}
          message={t("rounds.empty.live_message")}
          iconColor="text-yellow-500"
        />
      </CardTemplate>
    );
  }

  return (
    <CardTemplate
      title={t("rounds.titles.live")}
      description={t("rounds.descriptions.live")}
      isRefreshing={isLoading}
      refresh={refetch}
    >
      <>
        <RoundsTable rounds={data.rounds} />
        <CardFooter className="flex flex-col gap-3">
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 0 || isLoading}
            >
              {t("rounds.pagination.previous")}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t("rounds.pagination.page", {
                page: currentPage + 1,
                count: data.rounds.length,
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={data.rounds.length < ITEMS_PER_PAGE || isLoading}
            >
              {t("rounds.pagination.next")}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground text-center">
            {t("rounds.pagination.showing_live", {
              from: currentPage * ITEMS_PER_PAGE + 1,
              to: currentPage * ITEMS_PER_PAGE + data.rounds.length,
            })}
            <span className="ml-2 font-semibold">
              {t("rounds.notes.live_betting_closed")}
            </span>
          </div>
        </CardFooter>
      </>
    </CardTemplate>
  );
}
