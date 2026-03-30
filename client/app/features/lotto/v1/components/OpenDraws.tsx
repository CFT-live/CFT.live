"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useMemo, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorStateLotto } from "./ErrorStateLotto";
import { BuyTicketsDialog } from "./BuyTicketsDialog";
import { MILLIS, REFRESH_INTERVAL_MILLIS, usdcToWei, weiToUsdcString } from "../../../../helpers";
import { useBuyTickets } from "../../../prediction/v1/hooks/useBuyTickets";
import {
  LOTTO_CONTRACT_METADATA_QUERY_KEY,
  LOTTO_OPEN_DRAWS_QUERY_KEY,
} from "../queries/keys";
import { useQuery } from "../../../prediction/v1/hooks/useQuery";
import { request } from "graphql-request";
import { DEFAULT_HEADERS } from "../../../../queries/headers";
import { getOpenDrawsQuery } from "../queries/lotto";
import { useContractMetadata } from "@/app/features/lotto/v1/hooks/useContractMetadataLotto";
import { CardTemplate } from "../../../root/v1/components/CardTemplate";
import { useCloseDraw } from "@/app/features/prediction/v1/hooks/useCloseDraw";
import { useUserTicketCounts } from "@/app/features/lotto/v1/hooks/useUserTicketCounts";
import { AutoClearingAlert } from "../../../root/v1/components/AutoClearingAlert";
import { Ticket, Users, Clock } from "lucide-react";
import { useAppKitAccount } from "@reown/appkit/react";
import { ContractButton } from "../../../root/v1/components/ContractButton";
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

interface OpenDrawsData {
  draws: Draw[];
}

const ITEMS_PER_PAGE = 10;

export default function OpenDraws() {
  const t = useTranslations("lotto");
  const queryClient = useQueryClient();
  const { data: metadata, isLoading: isLoadingMetadata } =
    useContractMetadata();
  const [dialogOpen, setDialogOpen] = useState(false);

  const onCloseSuccess = useCallback(() => {
    setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: [LOTTO_CONTRACT_METADATA_QUERY_KEY],
      });
    }, 3 * MILLIS.inSecond);
  }, [queryClient]);

  const {
    closeDraw,
    isLoading: isClosing,
    errorMessage: closeError,
  } = useCloseDraw(onCloseSuccess);

  const { data, error, isLoading, isError, refetch } = useQuery<OpenDrawsData>({
    queryKey: [LOTTO_OPEN_DRAWS_QUERY_KEY],
    async queryFn(): Promise<OpenDrawsData> {
      const result = await request(
        process.env.NEXT_PUBLIC_LOTTO_THE_GRAPH_API_URL!,
        getOpenDrawsQuery,
        { first: ITEMS_PER_PAGE, skip: 0 },
        DEFAULT_HEADERS
      );
      return result as OpenDrawsData;
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

  const { address: userAddress } = useAppKitAccount();

  // Get draw IDs for user ticket count lookup
  const drawIds = useMemo(
    () => (data?.draws[0] ? [data.draws[0].id] : []),
    [data?.draws]
  );

  // Fetch user's ticket counts for the displayed draw
  const { ticketCountsByDraw } = useUserTicketCounts(drawIds);

  const onSuccess = useCallback(() => {
    setDialogOpen(false);
    reset();
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: [LOTTO_OPEN_DRAWS_QUERY_KEY] });
    }, 3 * MILLIS.inSecond);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  const {
    buyTickets,
    isLoading: isLoadingBuy,
    errorMessage,
    reset,
  } = useBuyTickets(onSuccess);

  const handleBuyTickets = (amount: number, total: bigint) => {
    buyTickets(amount, total);
  };

  // Countdown: must be before any early return (Rules of Hooks)
  const drawStartTime = data?.draws[0]?.startTime ?? "0";
  const minDuration = metadata?.minRoundDurationSeconds ?? 0;
  const canCloseAt = Number(drawStartTime) + minDuration;
  const [secondsUntilClose, setSecondsUntilClose] = useState<number>(() =>
    Math.max(0, canCloseAt - Math.floor(Date.now() / 1000))
  );
  useEffect(() => {
    if (canCloseAt <= 0) return;
    const tick = () =>
      setSecondsUntilClose(Math.max(0, canCloseAt - Math.floor(Date.now() / 1000)));
    tick();
    const id = setInterval(tick, MILLIS.inSecond);
    return () => clearInterval(id);
  }, [canCloseAt]);

  if (isLoading || isLoadingMetadata) {
    return (
      <CardTemplate
        title={t("open_draws_title")}
        description={t("open_draws_loading_description")}
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
        title={t("open_draws_title")}
        description={t("open_draws_error_description")}
        isRefreshing={isLoading}
        refresh={refetch}
      >
        <ErrorStateLotto
          title={t("open_draws_error_title")}
          message={error?.message || t("unknown_error")}
          details={t("open_draws_error_details")}
        />
      </CardTemplate>
    );
  }

  const draw: Draw = data?.draws[0] || {
    id: metadata ? `${metadata.currentDrawId + 1}` : "1",
    startTime: "0",
    ticketPrice: `${usdcToWei(metadata ? metadata.ticketPrice : "1")}`,
    potSize: "0",
    ticketCount: "0",
    open: true,
    winnerChosen: false,
    winner: null,
    claimed: false,
    closeTime: null,
    requestId: null,
  };

  const ticketPriceNumber = Number.parseFloat(
    weiToUsdcString(draw.ticketPrice)
  );
  const currentTicketCount = Number(draw.ticketCount);
  const maxTicketAmount = metadata?.maxTicketAmount ?? 100;

  const canClose = secondsUntilClose === 0 && currentTicketCount > 0;

  const formatCountdown = (secs: number) => {
    if (secs <= 0) return null;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // Win odds for connected user
  const userTickets = Number(ticketCountsByDraw[draw.id] ?? BigInt(0));
  const winOddsLabel =
    userTickets > 0 && currentTicketCount > 0
      ? `${((userTickets / currentTicketCount) * 100).toFixed(1)}%`
      : null;

  return (
    <CardTemplate
      title={t("open_draws_title")}
      description={t("open_draws_description")}
      isRefreshing={isLoading}
      refresh={refetch}
    >
      <div className="space-y-4">
        {/* Header row: draw ID + status dot */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="space-y-0.5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{t("open_draws_current_draw")}</div>
            <div className="text-xl font-mono text-foreground flex items-center gap-2">
              #{draw.id}
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
            </div>
          </div>
          {/* Win odds badge */}
          {winOddsLabel && (
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">{t("open_draws_your_win_odds")}</div>
              <div className="font-mono font-bold text-primary text-base">{winOddsLabel}</div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase">
              <Ticket className="w-3 h-3" /> {t("open_draws_ticket_price")}
            </div>
            <div className="font-mono text-lg">${weiToUsdcString(draw.ticketPrice)}</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase">
              <Users className="w-3 h-3" /> {t("open_draws_tickets_sold")}
            </div>
            <div className="font-mono text-lg">{draw.ticketCount}</div>
          </div>
        </div>

        {/* User Holdings */}
        {userAddress && (
          <div className="bg-muted/10 rounded-sm p-3 border border-border/50 flex justify-between items-center">
            <span className="text-[10px] uppercase text-muted-foreground">{t("open_draws_your_holdings")}</span>
            <span className="font-mono text-primary font-bold">
              {userTickets}{" "}
              <span className="text-[10px] font-normal text-muted-foreground">{t("open_draws_tickets_unit")}</span>
            </span>
          </div>
        )}

        {/* Countdown progress bar */}
        {secondsUntilClose > 0 && minDuration > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] uppercase text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t("open_draws_draw_opens_in")}</span>
              <span className="font-mono text-foreground">{formatCountdown(secondsUntilClose)}</span>
            </div>
            <div className="w-full h-1 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/60 rounded-full transition-all duration-1000"
                style={{ width: `${Math.max(2, 100 - (secondsUntilClose / minDuration) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-1 grid grid-cols-1 gap-3">
          <ContractButton
            size="lg"
            variant="default"
            onClick={() => setDialogOpen(true)}
            className="w-full font-mono uppercase tracking-wider"
          >
            {t("open_draws_buy_tickets")}
          </ContractButton>

          <div className="flex flex-col gap-2">
            <ContractButton
              onClick={closeDraw}
              disabled={isClosing || !canClose}
              size="default"
              variant="outline"
              className="w-full font-mono uppercase tracking-wider border-primary/50 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary transition-all"
            >
              {isClosing ? t("open_draws_executing") : t("open_draws_execute_draw")}
            </ContractButton>
            {!canClose && currentTicketCount === 0 && (
              <p className="text-[10px] text-center text-muted-foreground">{t("open_draws_no_tickets_to_close")}</p>
            )}
            <AutoClearingAlert message={closeError} variant="destructive" />
          </div>
        </div>
      </div>

      <BuyTicketsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        drawId={draw.id}
        ticketPrice={ticketPriceNumber}
        maxTicketAmount={maxTicketAmount}
        onBuyTickets={handleBuyTickets}
        isLoading={isLoadingBuy}
        errorMessage={errorMessage}
        onReset={reset}
      />
    </CardTemplate>
  );
}
