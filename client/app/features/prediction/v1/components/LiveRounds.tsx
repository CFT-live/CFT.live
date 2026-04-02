"use client";

import { useTranslations } from "next-intl";
import { getLiveRoundsQuery } from "../queries/predictionMarket";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { LIVE_ROUNDS_QUERY_KEY } from "../queries/keys";
import { CardTemplate } from "../../../root/v1/components/CardTemplate";
import { Round } from "../../../../types";
import RoundsTable from "./RoundsTable";
import { useRoundsQuery, ITEMS_PER_PAGE } from "../hooks/useRoundsQuery";
import { RoundsPaginationFooter } from "./RoundsPaginationFooter";

interface LiveRoundsData {
  rounds: Round[];
}

export default function LiveRounds() {
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
  } = useRoundsQuery<LiveRoundsData>(LIVE_ROUNDS_QUERY_KEY, getLiveRoundsQuery);

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
      <RoundsTable rounds={data.rounds} />
      <RoundsPaginationFooter
        currentPage={currentPage}
        roundCount={data.rounds.length}
        isLoading={isLoading}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        showingText={t("rounds.pagination.showing_live", {
          from: currentPage * ITEMS_PER_PAGE + 1,
          to: currentPage * ITEMS_PER_PAGE + data.rounds.length,
        })}
        note={t("rounds.notes.live_betting_closed")}
      />
    </CardTemplate>
  );
}

