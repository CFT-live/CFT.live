"use client";

import NumberFlow from "@number-flow/react";
import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useContractMetadata } from "../hooks/useContractMetadataLotto";
import { useQuery } from "../../../prediction/v1/hooks/useQuery";
import { request } from "graphql-request";
import { DEFAULT_HEADERS } from "../../../../queries/headers";
import { getOpenDrawsQuery } from "../queries/lotto";
import { LOTTO_OPEN_DRAWS_QUERY_KEY } from "../queries/keys";
import { MILLIS, REFRESH_INTERVAL_MILLIS, weiToUsdc, weiToUsdcString } from "../../../../helpers";
import { useAppKitAccount } from "@reown/appkit/react";
import { useUserTicketCounts } from "../hooks/useUserTicketCounts";
import { ContractButton } from "../../../root/v1/components/ContractButton";
import { BuyTicketsDialog } from "./BuyTicketsDialog";
import { useBuyTickets } from "../../../prediction/v1/hooks/useBuyTickets";

interface Draw {
  id: string;
  potSize: string;
  ticketPrice: string;
  ticketCount: string;
  open: boolean;
}

interface OpenDrawsData {
  draws: Draw[];
}

export function HeroPrizePool() {
  const t = useTranslations("lotto");
  const queryClient = useQueryClient();
  const { data: metadata } = useContractMetadata();
  const { address: userAddress } = useAppKitAccount();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data } = useQuery<OpenDrawsData>({
    queryKey: [LOTTO_OPEN_DRAWS_QUERY_KEY],
    async queryFn(): Promise<OpenDrawsData> {
      return await request(
        process.env.NEXT_PUBLIC_LOTTO_THE_GRAPH_API_URL ?? "",
        getOpenDrawsQuery,
        { first: 1, skip: 0 },
        DEFAULT_HEADERS
      ) as unknown as OpenDrawsData;
    },
    staleTime: REFRESH_INTERVAL_MILLIS.medium,
    refetchInterval: REFRESH_INTERVAL_MILLIS.medium,
  });

  const onSuccess = useCallback(() => {
    setDialogOpen(false);
    reset();
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: [LOTTO_OPEN_DRAWS_QUERY_KEY] });
    }, 3 * MILLIS.inSecond);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  const { buyTickets, isLoading: isLoadingBuy, errorMessage, reset } = useBuyTickets(onSuccess);

  const draw = data?.draws[0];
  const potUSDC = draw ? weiToUsdc(draw.potSize) : 0;
  const ticketCount = draw ? Number(draw.ticketCount) : 0;
  const drawId = draw?.id ?? (metadata ? `${metadata.currentDrawId}` : "1");
  const ticketPriceNumber = draw ? Number.parseFloat(weiToUsdcString(draw.ticketPrice)) : (metadata?.ticketPrice ?? 1);
  const maxTicketAmount = metadata?.maxTicketAmount ?? 100;

  const drawIds = useMemo(() => (draw ? [draw.id] : []), [draw]);
  const { ticketCountsByDraw } = useUserTicketCounts(drawIds);
  const userTickets = draw ? Number(ticketCountsByDraw[draw.id] ?? BigInt(0)) : 0;

  const winChance =
    ticketCount > 0 && userTickets > 0
      ? ((userTickets / ticketCount) * 100).toFixed(1)
      : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative overflow-hidden rounded-sm border border-primary/30 bg-linear-to-br from-background via-muted/10 to-primary/5 p-6 sm:p-10 mb-6 sm:mb-8 text-center"
      >
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
        </div>

        {/* Draw badge */}
        <div className="relative flex items-center justify-center gap-2 mb-4">
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
            {t("hero_draw_label")} #{drawId}
          </span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        </div>

        {/* Prize pool */}
        <div className="relative mb-2">
          <p className="text-[10px] sm:text-xs text-primary/70 uppercase tracking-widest mb-2">
            {t("open_draws_estimated_prize_pool")}
          </p>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl sm:text-6xl font-extrabold font-mono text-primary tracking-tighter drop-shadow-[0_0_20px_rgba(249,115,22,0.4)]">
              $<NumberFlow value={potUSDC} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
            </span>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground font-mono">
            <span>{t("hero_ticket_price_label")}: ${metadata?.ticketPrice ?? "—"}</span>
            <span>·</span>
            <span>{t("hero_tickets_sold_label")}: {ticketCount}</span>
          </div>
        </div>

        {/* Winning odds (shown when wallet connected and has tickets) */}
        {userAddress && userTickets > 0 && winChance && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-sm px-4 py-2 mb-4 mx-auto mt-3"
          >
            <Trophy className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-mono text-primary">
              {t("hero_your_odds_label")}: <strong>{winChance}%</strong> ({userTickets} {t("hero_tickets_unit")})
            </span>
          </motion.div>
        )}

        {/* CTA */}
        <div className="relative mt-5">
          <ContractButton
            size="lg"
            variant="default"
            onClick={() => setDialogOpen(true)}
            className="font-mono uppercase tracking-widest px-8 sm:px-12 text-base animate-pulse hover:animate-none"
          >
            {t("open_draws_buy_tickets")}
          </ContractButton>
          {!userAddress && (
            <p className="mt-2 text-[10px] text-muted-foreground uppercase tracking-wide">
              {t("hero_connect_to_play")}
            </p>
          )}
        </div>
      </motion.div>

      <BuyTicketsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        drawId={drawId}
        ticketPrice={ticketPriceNumber}
        currentTicketCount={ticketCount}
        maxTicketAmount={maxTicketAmount}
        onBuyTickets={(amount, total) => buyTickets(amount, total)}
        isLoading={isLoadingBuy}
        errorMessage={errorMessage}
        onReset={reset}
      />
    </>
  );
}

