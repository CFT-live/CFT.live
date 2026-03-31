"use client";

import { useTranslations } from "next-intl";
import { getClosedRoundsQuery } from "../queries/predictionMarket";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { CLOSED_ROUNDS_QUERY_KEY } from "../queries/keys";
import { Round } from "../../../../types";
import { CardTemplate } from "../../../root/v1/components/CardTemplate";
import RoundsTable from "./RoundsTable";
import { useRoundsQuery, ITEMS_PER_PAGE } from "../hooks/useRoundsQuery";
import { RoundsPaginationFooter } from "./RoundsPaginationFooter";

interface ClosedRoundsData {
  rounds: Round[];
}

export default function ClosedRounds() {
  const t = useTranslations("prediction");
  const {
    data,
    error,
    isLoading,
    isError,
    refetch,
    currentPage,
    handlePreviousPage,
    handleNextPage,
  } = useRoundsQuery<ClosedRoundsData>(CLOSED_ROUNDS_QUERY_KEY, getClosedRoundsQuery);

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
      <RoundsPaginationFooter
        currentPage={currentPage}
        roundCount={data.rounds.length}
        isLoading={isLoading}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        showingText={t("rounds.pagination.showing_closed", {
          from: currentPage * ITEMS_PER_PAGE + 1,
          to: currentPage * ITEMS_PER_PAGE + data.rounds.length,
        })}
      />
    </CardTemplate>
  );
}

