"use client";

import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { getOpenRoundsQuery } from "../queries/predictionMarket";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { useState, useCallback } from "react";
import { POSITION_ENUM, usdcToWei } from "../../../../helpers";
import { Position, Round } from "../../../../types";
import { useSafeWriteContract } from "../hooks/useSafeWriteContract";
import {
  CONTRACT_BALANCE_QUERY_KEY,
  OPEN_ROUNDS_QUERY_KEY,
} from "../queries/keys";
import RoundsTable from "./RoundsTable";
import { CardTemplate } from "../../../root/v1/components/CardTemplate";
import { useRoundsQuery, ITEMS_PER_PAGE } from "../hooks/useRoundsQuery";
import { RoundsPaginationFooter } from "./RoundsPaginationFooter";
import { BetDialog } from "./BetDialog";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";

interface OpenRoundsData {
  rounds: Round[];
}

export default function OpenRounds() {
  const t = useTranslations("prediction");
  const queryClient = useQueryClient();
  const { isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    data,
    error,
    isLoading,
    isError,
    refetch,
    currentPage,
    handlePreviousPage,
    handleNextPage,
  } = useRoundsQuery<OpenRoundsData>(OPEN_ROUNDS_QUERY_KEY, getOpenRoundsQuery);

  const onSuccess = useCallback(() => {
    setDialogOpen(false);
    setSelectedPosition(null);
    setSelectedRoundId(null);
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    reset();
    // Invalidate immediately — receipt is already confirmed on-chain
    queryClient.invalidateQueries({ queryKey: [OPEN_ROUNDS_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: [CONTRACT_BALANCE_QUERY_KEY] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  const {
    writeToContract,
    isLoading: isLoadingBet,
    errorMessage,
    reset,
  } = useSafeWriteContract(onSuccess);

  const openBetDialog = (position: Position, roundId: string) => {
    setSelectedPosition(position);
    setSelectedRoundId(roundId);
    setDialogOpen(true);
  };

  const handleConfirmBet = (roundId: string, position: Position, betAmount: string) => {
    const amount = Number.parseFloat(betAmount);
    if (Number.isNaN(amount) || amount <= 0) return;

    if (!isConnected) {
      open();
      return;
    }

    writeToContract("placeBet", [
      roundId,
      POSITION_ENUM[position],
      usdcToWei(amount),
    ]);
  };

  if (isLoading) {
    return (
      <CardTemplate
        title={t("rounds.titles.open")}
        description={t("rounds.loading.open")}
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
        title={t("rounds.titles.open")}
        description={t("rounds.loading.error_loading_data")}
        isRefreshing={isLoading}
        refresh={refetch}
      >
        <ErrorState
          title={t("rounds.errors.open_title")}
          message={error?.message || t("rounds.errors.unknown_error")}
          details={t("rounds.errors.open_details")}
        />
      </CardTemplate>
    );
  }

  if (!data?.rounds.length) {
    return (
      <CardTemplate
        title={t("rounds.titles.open")}
        description={t("rounds.descriptions.open")}
        isRefreshing={isLoading}
        refresh={refetch}
      >
        <EmptyState
          title={t("rounds.empty.open_title")}
          message={t("rounds.empty.open_message")}
        />
      </CardTemplate>
    );
  }

  return (
    <CardTemplate
      title={t("rounds.titles.open")}
      description={t("rounds.descriptions.open")}
      isRefreshing={isLoading}
      refresh={refetch}
    >
      <RoundsTable rounds={data.rounds} openBetDialog={openBetDialog} />
      <RoundsPaginationFooter
        currentPage={currentPage}
        roundCount={data.rounds.length}
        isLoading={isLoading}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        showingText={t("rounds.pagination.showing_open", {
          from: currentPage * ITEMS_PER_PAGE + 1,
          to: currentPage * ITEMS_PER_PAGE + data.rounds.length,
        })}
        note={t("rounds.notes.open_bet_before_lock")}
      />

      <BetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        roundId={selectedRoundId}
        initialPosition={selectedPosition}
        isLoading={isLoadingBet}
        errorMessage={errorMessage}
        onConfirm={handleConfirmBet}
        onCancel={reset}
      />
    </CardTemplate>
  );
}

