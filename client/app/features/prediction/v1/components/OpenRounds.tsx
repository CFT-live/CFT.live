"use client";

import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { getOpenRoundsQuery } from "../queries/predictionMarket";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { useState, useCallback } from "react";
import { REFRESH_INTERVAL_MILLIS, weiToUsdcString } from "../../../../helpers";
import { Position, Round } from "../../../../types";
import { useDepositAndBet } from "../hooks/useDepositAndBet";
import {
  CONTRACT_BALANCE_QUERY_KEY,
  OPEN_ROUNDS_QUERY_KEY,
} from "../queries/keys";
import RoundsTable from "./RoundsTable";
import { CardTemplate } from "../../../root/v1/components/CardTemplate";
import { useRoundsQuery, ITEMS_PER_PAGE } from "../hooks/useRoundsQuery";
import { RoundsPaginationFooter } from "./RoundsPaginationFooter";
import { BetDialog } from "./BetDialog";
import { FeaturedRound } from "./FeaturedRound";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useChainId, useConfig } from "wagmi";
import { readContract } from "wagmi/actions";
import {
  PREDICTION_MARKET_ABI,
  PREDICTION_MARKET_ADDRESS,
} from "../../../../lib/contracts";
import { useQuery } from "../hooks/useQuery";

interface OpenRoundsData {
  rounds: Round[];
}

export default function OpenRounds() {
  const t = useTranslations("prediction");
  const queryClient = useQueryClient();
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const chainId = useChainId();
  const config = useConfig();
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Inline contract balance for the header
  const { data: balanceData } = useQuery<bigint | null>({
    queryKey: [CONTRACT_BALANCE_QUERY_KEY, address, chainId],
    queryFn: async () => {
      if (!address || !isConnected) return null;
      return (await readContract(config, {
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_ABI,
        functionName: "getUserBalance",
        account: address as `0x${string}`,
        args: [],
      })) as bigint;
    },
    enabled: isConnected && !!address,
    retry: false,
    staleTime: REFRESH_INTERVAL_MILLIS.medium,
    refetchInterval: false,
  });

  const balanceString =
    balanceData == null ? null : weiToUsdcString(balanceData);

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
    setSelectedAmount(null);
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    reset();
    // Invalidate immediately — receipt is already confirmed on-chain
    queryClient.invalidateQueries({ queryKey: [OPEN_ROUNDS_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: [CONTRACT_BALANCE_QUERY_KEY] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  const {
    depositAndBet,
    isLoading: isLoadingBet,
    errorMessage,
    flowState,
    reset,
  } = useDepositAndBet(onSuccess);

  const openBetDialog = (position: Position, roundId: string, amount?: string) => {
    setSelectedPosition(position);
    setSelectedRoundId(roundId);
    setSelectedAmount(amount ?? null);
    setDialogOpen(true);
  };

  const handleConfirmBet = (roundId: string, position: Position, betAmount: string) => {
    const amount = Number.parseFloat(betAmount);
    if (Number.isNaN(amount) || amount <= 0) return;

    if (!isConnected) {
      open();
      return;
    }

    depositAndBet(roundId, position, betAmount);
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
    <div className="space-y-4">
      <FeaturedRound rounds={data.rounds} openBetDialog={openBetDialog} />
      <CardTemplate
        title={t("rounds.titles.open")}
        description={
          balanceString
            ? `${t("rounds.descriptions.open")} · ${t("rounds.balance_inline", { balance: balanceString })}`
            : t("rounds.descriptions.open")
        }
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
        initialAmount={selectedAmount}
        isLoading={isLoadingBet}
        errorMessage={errorMessage}
        onConfirm={handleConfirmBet}
        onCancel={reset}
        contractBalance={balanceString}
        flowStep={flowState.step}
        flowTotalSteps={flowState.totalSteps}
        flowCurrentStep={flowState.currentStepNumber}
      />
    </CardTemplate>
    </div>
  );
}

