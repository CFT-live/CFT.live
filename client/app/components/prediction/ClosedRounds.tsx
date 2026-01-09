"use client";

import { useTranslations } from "next-intl";
import { request } from "graphql-request";
import { getClosedRoundsQuery } from "../../queries/predictionMarket";
import { DEFAULT_HEADERS } from "../../queries/headers";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { CLOSED_ROUNDS_QUERY_KEY } from "../../queries/keys";
import { REFRESH_INTERVAL_MILLIS } from "../../helpers";
import { useQuery } from "../../hooks/useQuery";
import { Round } from "../../types";
import { CardTemplate } from "../CardTemplate";
import RoundsTable from "./RoundsTable";
import { useState } from "react";

interface ClosedRoundsData {
  rounds: Round[];
}

const ITEMS_PER_PAGE = 10;

export default function ClosedRounds() {
  const t = useTranslations("prediction");
  const [currentPage, setCurrentPage] = useState(0);
  const { data, error, isLoading, isError, refetch } =
    useQuery<ClosedRoundsData>({
      queryKey: [CLOSED_ROUNDS_QUERY_KEY, currentPage],
      async queryFn(): Promise<ClosedRoundsData> {
        try {
          const result = await request(
            process.env.NEXT_PUBLIC_THE_GRAPH_API_URL!,
            getClosedRoundsQuery,
            { first: ITEMS_PER_PAGE, skip: currentPage * ITEMS_PER_PAGE },
            DEFAULT_HEADERS
          );
          return result as ClosedRoundsData;
        } catch (err) {
          console.error(t("rounds.errors.closed_request_failed"), err);
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
    });

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
        title={t("rounds.titles.closed")}
        description={t("rounds.loading.closed")}
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
        title={t("rounds.titles.closed")}
        description={t("rounds.loading.error_loading_data")}
        isRefreshing={isLoading}
        refresh={refetch}
      >
        <ErrorState
          title={t("rounds.errors.closed_title")}
          message={error?.message || t("rounds.errors.unknown_error")}
          details={t("rounds.errors.closed_details")}
        />
      </CardTemplate>
    );
  }

  if (!data?.rounds?.length) {
    return (
      <CardTemplate
        title={t("rounds.titles.closed")}
        description={t("rounds.descriptions.closed")}
        isRefreshing={isLoading}
        refresh={refetch}
      >
        <EmptyState
          title={t("rounds.empty.closed_title")}
          message={t("rounds.empty.closed_message")}
          iconColor="text-yellow-500"
        />
      </CardTemplate>
    );
  }

  return (
    <CardTemplate
      title={t("rounds.titles.closed_with_count", { count: data.rounds.length })}
      description={t("rounds.descriptions.closed")}
      isRefreshing={isLoading}
      refresh={refetch}
    >
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
          {t("rounds.pagination.showing_closed", {
            from: currentPage * ITEMS_PER_PAGE + 1,
            to: currentPage * ITEMS_PER_PAGE + data.rounds.length,
          })}
        </div>
      </CardFooter>
    </CardTemplate>
  );
}
