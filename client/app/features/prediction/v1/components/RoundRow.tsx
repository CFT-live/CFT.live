"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {
  priceToString,
  weiToUsdcString,
  MILLIS,
  numberPriceToBigInt,
} from "../../../../helpers";
import { Position, Round } from "../../../../types";
import { useAssetPrice } from "../hooks/useAssetPrice";

interface RoundRowProps {
  readonly round: Round;
  readonly getStatusVariant: (
    status: string
  ) => "default" | "secondary" | "destructive" | "outline";
  readonly openBetDialog?: (position: Position, roundId: string) => void;
}

export default function RoundRow({
  round,
  getStatusVariant,
  openBetDialog,
}: Readonly<RoundRowProps>) {
  const t = useTranslations("prediction");

  const statusLabel = getStatusLabel(t, round.status);

  return (
    <Card className="shrink-0 w-[280px] sm:w-[300px] hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2 px-3 sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={getStatusVariant(round.status)} className="text-xs">
            {statusLabel}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl font-bold truncate">{round.asset}</span>
            <CardTitle className="text-sm font-mono text-muted-foreground">#{round.id}</CardTitle>
          </div>
        </div>
        {/* Prominent Payout Multipliers */}
        <PayoutDisplay t={t} round={round} isOpen={round.status === "OPEN"} />
      </CardHeader>

      <CardContent className="space-y-2 px-3 sm:px-4">
        {/* Volume and Bets - Compact display */}
        <div className="flex justify-between items-center text-xs text-muted-foreground pb-2 border-b gap-2">
          <div className="truncate">
            <span className="text-foreground font-medium">${weiToUsdcString(round.totalAmount)}</span>
            <span className="hidden sm:inline"> {t("rounds.round_card.volume_abbrev")}</span>
            <span className="mx-1">·</span>
            <span>
              {t("rounds.round_card.bets_count", { count: round.totalBetsCount })}
            </span>
          </div>
          <div className="flex gap-1 shrink-0">
            <span className="text-primary">↑{round.upBetsCount}</span>
            <span className="text-destructive">↓{round.downBetsCount}</span>
          </div>
        </div>

        {/* Timing */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground shrink-0">
              {t("rounds.round_card.lock")}
            </span>
            <TimeDisplay t={t} timestamp={round.lockAt} />
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground shrink-0">
              {t("rounds.round_card.close")}
            </span>
            {round.status === "CANCELLED" ? (
              <span className="text-muted-foreground">-</span>
            ) : (
              <TimeDisplay t={t} timestamp={round.closeAt} />
            )}
          </div>
        </div>

        {/* Status-specific content */}
        {round.status === "OPEN" && openBetDialog && (
          <BettingButtons t={t} round={round} openBetDialog={openBetDialog} />
        )}

        {round.status === "LIVE" && <LivePriceDisplay t={t} round={round} />}

        {round.status === "CLOSED" && (
          <PriceMovementDisplay
            t={t}
            lockPrice={round.lockPrice}
            closePrice={round.closePrice}
            priceChangePercent={round.priceChangePercent}
            finalPosition={round.finalPosition}
          />
        )}
      </CardContent>
    </Card>
  );
}

const BettingButtons = ({
  t,
  round,
  openBetDialog,
}: {
  t: ReturnType<typeof useTranslations>;
  round: Round;
  openBetDialog: (position: Position, roundId: string) => void;
}) => {
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    const checkTime = () => {
      const now = Date.now();
      const lockTime = Number.parseInt(round.lockAt) * MILLIS.inSecond;
      const closeTime = Number.parseInt(round.closeAt) * MILLIS.inSecond;
      
      // Disable if current time is >= lockAt or closeAt
      setIsDisabled(now >= lockTime || now >= closeTime);
    };

    checkTime();
    const interval = setInterval(checkTime, MILLIS.inSecond);

    return () => clearInterval(interval);
  }, [round.lockAt, round.closeAt]);

  return (
    <div className="grid grid-cols-2 gap-2 pt-2">
      <Button
        size="sm"
        variant="default"
        onClick={() => openBetDialog("UP", round.id)}
        className="w-full text-xs sm:text-sm"
        disabled={isDisabled}
      >
        {t("rounds.positions.up_with_arrow")}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => openBetDialog("DOWN", round.id)}
        className="w-full text-xs sm:text-sm"
        disabled={isDisabled}
      >
        {t("rounds.positions.down_with_arrow")}
      </Button>
    </div>
  );
};

const PayoutDisplay = ({
  t,
  round,
  isOpen,
}: {
  t: ReturnType<typeof useTranslations>;
  round: Round;
  isOpen: boolean;
}) => {
  const upPayout = priceToString(round.payoutUp, 18, 2);
  const downPayout = priceToString(round.payoutDown, 18, 2);
  
  if (isOpen) {
    return (
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="text-center py-2 px-1 bg-primary/10 rounded">
          <div className="text-[10px] text-primary/80 uppercase tracking-wide">
            {t("rounds.round_card.up_wins")}
          </div>
          <div className="text-xl sm:text-2xl font-bold text-primary font-mono leading-tight">x{upPayout}</div>
        </div>
        <div className="text-center py-2 px-1 bg-destructive/10 rounded">
          <div className="text-[10px] text-destructive/80 uppercase tracking-wide">
            {t("rounds.round_card.down_wins")}
          </div>
          <div className="text-xl sm:text-2xl font-bold text-destructive font-mono leading-tight">x{downPayout}</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex justify-center gap-3 mt-2 pt-2 border-t border-dashed">
      <span className="text-base font-bold text-primary font-mono">↑x{upPayout}</span>
      <span className="text-muted-foreground">/</span>
      <span className="text-base font-bold text-destructive font-mono">↓x{downPayout}</span>
    </div>
  );
};

const PriceMovementDisplay = ({
  t,
  lockPrice,
  closePrice,
  priceChangePercent,
  finalPosition,
}: {
  t: ReturnType<typeof useTranslations>;
  lockPrice: bigint;
  closePrice: bigint;
  priceChangePercent?: string;
  finalPosition?: string;
}) => {
  const percentChange = priceChangePercent ? Number.parseFloat(priceChangePercent) : 0;
  const isUp = percentChange > 0;
  const isDown = percentChange < 0;
  
  const getPercentColor = () => {
    if (isUp) return "text-primary";
    if (isDown) return "text-destructive";
    return "text-muted-foreground";
  };
  
  return (
    <div className="space-y-2 pt-2 border-t">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground space-y-1">
          <div>
            <span className="opacity-70">{t("rounds.round_card.lock_price_label")}</span> ${priceToString(lockPrice)}
          </div>
          <div>
            <span className="opacity-70">{t("rounds.round_card.close_price_label")}</span> ${priceToString(closePrice)}
          </div>
        </div>
        {priceChangePercent && (
          <div
            className={`text-lg font-bold font-mono flex items-center shrink-0 ${getPercentColor()}`}
          >
            {isUp && <span>↑</span>}
            {isDown && <span>↓</span>}
            <span>{isUp ? "+" : ""}{formatPercentage(priceChangePercent)}%</span>
          </div>
        )}
      </div>
      {finalPosition && (
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {t("rounds.round_card.result")}
          </span>
          <Badge variant={getPositionVariant(finalPosition)} className="text-xs">
            {finalPosition === "UP" && "↑ "}
            {finalPosition === "DOWN" && "↓ "}
            {getPositionLabel(t, finalPosition)}
          </Badge>
        </div>
      )}
    </div>
  );
};

const LivePriceDisplay = ({
  t,
  round,
}: {
  t: ReturnType<typeof useTranslations>;
  round: Round;
}) => {
  const priceData = useAssetPrice(round.asset);
  const currentPrice = numberPriceToBigInt(priceData?.price || 0);
  const lockPriceNum = Number(round.lockPrice);
  const currentPriceNum = Number(currentPrice || round.closePrice);
  
  // Calculate live percentage change
  const livePercentChange = lockPriceNum > 0 
    ? ((currentPriceNum - lockPriceNum) / lockPriceNum) * 100 
    : 0;
  
  const trend = getCurrentTrend(
    round.lockPrice,
    currentPrice || round.closePrice
  );
  
  const getTrendColor = () => {
    if (trend.direction === "UP") return "text-primary";
    if (trend.direction === "DOWN") return "text-destructive";
    return "text-muted-foreground";
  };
  
  const getTrendVariant = (): "default" | "destructive" | "outline" => {
    if (trend.direction === "UP") return "default";
    if (trend.direction === "DOWN") return "destructive";
    return "outline";
  };
  
  return (
    <div className="space-y-2 pt-2 border-t">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground space-y-1">
          <div>
            <span className="opacity-70">{t("rounds.round_card.lock_price_label")}</span> ${priceToString(round.lockPrice)}
          </div>
          <div>
            <span className="opacity-70">{t("rounds.round_card.now_price_label")}</span> ${priceToString(currentPrice)}
          </div>
        </div>
        <div
          className={`text-lg font-bold font-mono flex items-center shrink-0 ${getTrendColor()}`}
        >
          {trend.direction === "UP" && <span className="animate-pulse">↑</span>}
          {trend.direction === "DOWN" && <span className="animate-pulse">↓</span>}
          <span>
            {livePercentChange >= 0 ? "+" : ""}
            {livePercentChange.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          {t("rounds.round_card.trend")}
        </span>
        <Badge 
          variant={getTrendVariant()} 
          className="animate-pulse text-xs"
        >
          {trend.direction === "UP" && "↑ "}
          {trend.direction === "DOWN" && "↓ "}
          {getPositionLabel(t, trend.direction)}
        </Badge>
      </div>
    </div>
  );
};

const TimeDisplay = ({
  t,
  timestamp,
}: {
  t: ReturnType<typeof useTranslations>;
  timestamp: string;
}) => {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    const updateDisplay = () => {
      const targetTime = Number.parseInt(timestamp) * MILLIS.inSecond;
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        // Time has passed, show timestamp
        setDisplay(new Date(targetTime).toLocaleString());
        return;
      }

      // Time is in future, show countdown
      const days = Math.floor(diff / (MILLIS.inSecond * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (MILLIS.inSecond * 60 * 60 * 24)) / (MILLIS.inSecond * 60 * 60)
      );
      const minutes = Math.floor(
        (diff % (MILLIS.inSecond * 60 * 60)) / (MILLIS.inSecond * 60)
      );
      const seconds = Math.floor(
        (diff % (MILLIS.inSecond * 60)) / MILLIS.inSecond
      );

      if (days > 0) {
        setDisplay(
          `${days}${t("rounds.time.days_short")} ${hours}${t("rounds.time.hours_short")} ${minutes}${t("rounds.time.minutes_short")}`
        );
      } else if (hours > 0) {
        setDisplay(
          `${hours}${t("rounds.time.hours_short")} ${minutes}${t("rounds.time.minutes_short")} ${seconds}${t("rounds.time.seconds_short")}`
        );
      } else if (minutes > 0) {
        setDisplay(
          `${minutes}${t("rounds.time.minutes_short")} ${seconds}${t("rounds.time.seconds_short")}`
        );
      } else {
        setDisplay(`${seconds}${t("rounds.time.seconds_short")}`);
      }
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, MILLIS.inSecond);

    return () => clearInterval(interval);
  }, [t, timestamp]);

  const targetTime = Number.parseInt(timestamp) * MILLIS.inSecond;
  // eslint-disable-next-line
  const isFuture = targetTime > Date.now();

  return (
    <span
      className={`truncate text-right ${
        isFuture
          ? "font-mono font-medium text-primary text-xs"
          : "text-muted-foreground text-xs"
      }`}
    >
      {display}
    </span>
  );
};

const getStatusLabel = (t: ReturnType<typeof useTranslations>, status: string) => {
  switch (status) {
    case "OPEN":
      return t("rounds.status.open");
    case "LIVE":
      return t("rounds.status.live");
    case "CLOSED":
      return t("rounds.status.closed");
    case "CANCELLED":
      return t("rounds.status.cancelled");
    default:
      return status;
  }
};

const getPositionLabel = (
  t: ReturnType<typeof useTranslations>,
  position: string | undefined
) => {
  switch (position) {
    case "UP":
      return t("rounds.positions.up");
    case "DOWN":
      return t("rounds.positions.down");
    case "EQUAL":
      return t("rounds.positions.equal");
    case "PENDING":
      return t("rounds.positions.pending");
    default:
      return position ?? "";
  }
};

const getPositionVariant = (
  position: string | undefined
): "default" | "secondary" | "destructive" | "outline" => {
  switch (position) {
    case "UP":
      return "default";
    case "DOWN":
      return "destructive";
    case "EQUAL":
      return "secondary";
    default:
      return "secondary";
  }
};

const formatPercentage = (percent: string) => {
  return Number.parseFloat(percent).toFixed(2);
};

const getCurrentTrend = (lockPrice: bigint, closePrice: bigint | undefined) => {
  if (!closePrice || closePrice === BigInt(0)) {
    return { direction: "PENDING", color: "text-muted-foreground" };
  }

  const lock = Number(lockPrice);
  const current = Number(closePrice);

  if (current > lock) {
    return { direction: "UP", color: "text-primary" };
  } else if (current < lock) {
    return { direction: "DOWN", color: "text-destructive" };
  } else {
    return { direction: "EQUAL", color: "text-muted-foreground" };
  }
};
