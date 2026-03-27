"use client";

import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { request } from "graphql-request";
import { getOpenRoundsQuery } from "../queries/predictionMarket";
import { DEFAULT_HEADERS } from "../../../../queries/headers";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { useState, useCallback } from "react";
import {
  MILLIS,
  POSITION_ENUM,
  REFRESH_INTERVAL_MILLIS,
  usdcToWei,
} from "../../../../helpers";
import { Position, Round } from "../../../../types";
import { useSafeWriteContract } from "../hooks/useSafeWriteContract";
import {
  CONTRACT_BALANCE_QUERY_KEY,
  OPEN_ROUNDS_QUERY_KEY,
} from "../queries/keys";
import RoundsTable from "./RoundsTable";
import { CardTemplate } from "../../../root/v1/components/CardTemplate";
import { useQuery } from "../hooks/useQuery";
import { AutoClearingAlert } from "../../../root/v1/components/AutoClearingAlert";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";

interface OpenRoundsData {
  rounds: Round[];
}

const ITEMS_PER_PAGE = 10;

export default function OpenRounds() {
  const t = useTranslations("prediction");
  const queryClient = useQueryClient();
  const { isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const [betAmount, setBetAmount] = useState(() => {
    if (globalThis.window !== undefined) {
      return globalThis.localStorage.getItem("prediction_last_bet_amount") ?? "1";
    }
    return "1";
  });
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(
    null
  );
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const { data, error, isLoading, isError, refetch } = useQuery<OpenRoundsData>(
    {
      queryKey: [OPEN_ROUNDS_QUERY_KEY, currentPage],
      async queryFn(): Promise<OpenRoundsData> {
        try {
          const result = await request(
            process.env.NEXT_PUBLIC_THE_GRAPH_API_URL!,
            getOpenRoundsQuery,
            { first: ITEMS_PER_PAGE, skip: currentPage * ITEMS_PER_PAGE },
            DEFAULT_HEADERS
          );
          return result as OpenRoundsData;
        } catch (err) {
          console.error(t("rounds.errors.open_request_failed"), err);
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

  const onSuccess = useCallback(() => {
    setDialogOpen(false);
    setSelectedPosition(null);
    setSelectedRoundId(null);
    setSelectedRound(null);
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    reset();
    setTimeout(() => {
      // Placing a bet affects open rounds data and user's balance
      queryClient.invalidateQueries({ queryKey: [OPEN_ROUNDS_QUERY_KEY] });
      queryClient.invalidateQueries({
        queryKey: [CONTRACT_BALANCE_QUERY_KEY],
      });
    }, 3 * MILLIS.inSecond);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  const {
    writeToContract,
    isLoading: isLoadingBet,
    errorMessage,
    reset,
  } = useSafeWriteContract(onSuccess);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    if (data?.rounds.length === ITEMS_PER_PAGE) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const openBetDialog = (position: Position, roundId: string) => {
    setSelectedPosition(position);
    setSelectedRoundId(roundId);
    const round = data?.rounds.find((r) => r.id === roundId) ?? null;
    setSelectedRound(round);
    setDialogOpen(true);
  };

  const handleSetBetAmount = (val: string) => {
    setBetAmount(val);
    if (globalThis.window !== undefined) {
      globalThis.localStorage.setItem("prediction_last_bet_amount", val);
    }
  };

  const confirmBet = () => {
    if (!selectedPosition || !selectedRoundId || !betAmount) return;

    const amount = Number.parseFloat(betAmount);
    if (Number.isNaN(amount) || amount <= 0) return;

    if (!isConnected) {
      open();
      return;
    }

    if (globalThis.window !== undefined) {
      globalThis.localStorage.setItem("prediction_last_bet_amount", betAmount);
    }
    writeToContract("placeBet", [
      selectedRoundId,
      POSITION_ENUM[selectedPosition],
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
          {t("rounds.pagination.showing_open", {
            from: currentPage * ITEMS_PER_PAGE + 1,
            to: currentPage * ITEMS_PER_PAGE + data.rounds.length,
          })}
          <span className="ml-2 font-semibold">
            {t("rounds.notes.open_bet_before_lock")}
          </span>
        </div>
      </CardFooter>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("rounds.bet_dialog.title", {
                position:
                  selectedPosition === "UP"
                    ? t("rounds.positions.up_with_arrow")
                    : t("rounds.positions.down_with_arrow"),
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                selectedPosition === "UP"
                  ? "rounds.bet_dialog.description_up"
                  : "rounds.bet_dialog.description_down"
              )}{" "}
              {t("rounds.bet_dialog.round_id", {
                roundId: selectedRoundId ?? "-",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="betAmount">
                  {t("rounds.bet_dialog.amount_label")}
                </Label>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {t("rounds.bet_dialog.quick_amounts")}
                </span>
              </div>
              <div className="flex gap-1.5 mb-1.5">
                {["1", "5", "10", "25", "50"].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleSetBetAmount(val)}
                    disabled={isLoadingBet}
                    className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                      betAmount === val
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    ${val}
                  </button>
                ))}
              </div>
              <Input
                id="betAmount"
                type="number"
                min="1"
                step="1"
                value={betAmount}
                onChange={(e) => handleSetBetAmount(e.target.value)}
                placeholder={t("rounds.bet_dialog.amount_placeholder")}
                disabled={isLoadingBet}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("rounds.bet_dialog.position_label")}</Label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant={selectedPosition === "UP" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setSelectedPosition("UP")}
                  disabled={isLoadingBet}
                >
                  {t("rounds.positions.up_with_arrow")}
                </Button>
                <Button
                  type="button"
                  variant={
                    selectedPosition === "DOWN" ? "destructive" : "outline"
                  }
                  className="flex-1"
                  onClick={() => setSelectedPosition("DOWN")}
                  disabled={isLoadingBet}
                >
                  {t("rounds.positions.down_with_arrow")}
                </Button>
              </div>
            </div>
            <AutoClearingAlert message={errorMessage} variant="destructive" />
            {isLoadingBet && (
              <Alert className="border-primary bg-accent">
                <AlertDescription>
                  <strong className="font-semibold">
                    {t("rounds.bet_dialog.processing_title")}
                  </strong>
                  <p className="mt-1 text-sm">
                    {t("rounds.bet_dialog.processing_description")}
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoadingBet} onClick={reset}>
              {t("rounds.bet_dialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmBet();
              }}
              disabled={
                isLoadingBet ||
                !betAmount ||
                !selectedPosition ||
                Number.parseFloat(betAmount) <= 0
              }
            >
              {isLoadingBet
                ? t("rounds.bet_dialog.processing")
                : t("rounds.bet_dialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CardTemplate>
  );
}
