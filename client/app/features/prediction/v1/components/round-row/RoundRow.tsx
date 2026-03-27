"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { weiToUsdcString, MILLIS } from "../../../../../helpers";
import type { Position, Round } from "../../../../../types";
import { getStatusLabel } from "./round-utils";
import PayoutDisplay from "./PayoutDisplay";
import PoolRatioBar from "./PoolRatioBar";
import BettingButtons from "./BettingButtons";
import LivePriceDisplay from "./LivePriceDisplay";
import PriceMovementDisplay from "./PriceMovementDisplay";
import TimeDisplay from "./TimeDisplay";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

interface RoundRowProps {
  readonly round: Round;
  readonly getStatusVariant: (status: string) => BadgeVariant;
  readonly openBetDialog?: (position: Position, roundId: string) => void;
}

const CLOSING_SOON_THRESHOLD_MS = 2 * 60 * 1000;

export default function RoundRow({
  round,
  getStatusVariant,
  openBetDialog,
}: Readonly<RoundRowProps>) {
  const t = useTranslations("prediction");
  const [closingSoon, setClosingSoon] = useState(false);

  useEffect(() => {
    if (round.status !== "OPEN") return;
    const check = () => {
      const lockTime = Number.parseInt(round.lockAt) * MILLIS.inSecond;
      setClosingSoon(lockTime - Date.now() <= CLOSING_SOON_THRESHOLD_MS && lockTime > Date.now());
    };
    check();
    const interval = setInterval(check, MILLIS.inSecond);
    return () => clearInterval(interval);
  }, [round.lockAt, round.status]);

  const cardClass = [
    "shrink-0 w-[280px] sm:w-[300px] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
    closingSoon ? "ring-1 ring-destructive/60 animate-pulse-ring" : "",
    round.status === "LIVE" ? "ring-1 ring-primary/30" : "",
    round.status === "CANCELLED" ? "opacity-60" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Card className={cardClass}>
      <CardHeader className="pb-2 px-3 sm:px-4">
        <RoundHeader
          t={t}
          round={round}
          closingSoon={closingSoon}
          getStatusVariant={getStatusVariant}
        />
        <PayoutDisplay round={round} isOpen={round.status === "OPEN"} />
      </CardHeader>

      <CardContent className="space-y-2.5 px-3 sm:px-4">
        <PoolRatioBar upAmount={Number(round.upAmount)} downAmount={Number(round.downAmount)} />

        <VolumeStats t={t} round={round} />

        <TimingSection t={t} round={round} />

        {round.status === "OPEN" && openBetDialog && (
          <BettingButtons round={round} openBetDialog={openBetDialog} />
        )}

        {round.status === "LIVE" && <LivePriceDisplay round={round} />}

        {round.status === "CLOSED" && (
          <PriceMovementDisplay
            lockPrice={round.lockPrice}
            closePrice={round.closePrice}
            priceChangePercent={round.priceChangePercent}
            finalPosition={round.finalPosition}
            asset={round.asset}
          />
        )}
      </CardContent>
    </Card>
  );
}

function RoundHeader({
  t,
  round,
  closingSoon,
  getStatusVariant,
}: Readonly<{
  t: ReturnType<typeof useTranslations>;
  round: Round;
  closingSoon: boolean;
  getStatusVariant: (status: string) => BadgeVariant;
}>) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <Badge variant={getStatusVariant(round.status)} className="text-xs">
          {getStatusLabel(t, round.status)}
        </Badge>
        {closingSoon && (
          <Badge variant="destructive" className="text-[9px] animate-pulse">
            {t("rounds.round_card.closing_soon")}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-lg sm:text-xl font-bold truncate">{round.asset}</span>
        <CardTitle className="text-sm font-mono text-muted-foreground">#{round.id}</CardTitle>
      </div>
    </div>
  );
}

function VolumeStats({
  t,
  round,
}: Readonly<{
  t: ReturnType<typeof useTranslations>;
  round: Round;
}>) {
  return (
    <div className="flex justify-between items-center text-xs text-muted-foreground pb-2 border-b border-border/40 gap-2">
      <div className="truncate">
        <span className="text-foreground font-medium">
          ${weiToUsdcString(round.totalAmount)}
        </span>
        <span className="hidden sm:inline"> {t("rounds.round_card.volume_abbrev")}</span>
        <span className="mx-1 opacity-40">·</span>
        <span>{t("rounds.round_card.bets_count", { count: round.totalBetsCount })}</span>
      </div>
      <div className="flex gap-1.5 shrink-0 font-mono text-[11px]">
        <span className="text-primary">↑{round.upBetsCount}</span>
        <span className="text-destructive">↓{round.downBetsCount}</span>
      </div>
    </div>
  );
}

function TimingSection({
  t,
  round,
}: Readonly<{
  t: ReturnType<typeof useTranslations>;
  round: Round;
}>) {
  return (
    <div className="space-y-1 text-xs">
      <div className="flex justify-between items-center gap-2">
        <span className="text-muted-foreground shrink-0">
          {t("rounds.round_card.lock")}
        </span>
        <TimeDisplay timestamp={round.lockAt} />
      </div>
      <div className="flex justify-between items-center gap-2">
        <span className="text-muted-foreground shrink-0">
          {t("rounds.round_card.close")}
        </span>
        {round.status === "CANCELLED" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <TimeDisplay timestamp={round.closeAt} />
        )}
      </div>
    </div>
  );
}
