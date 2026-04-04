"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { priceToString, numberPriceToBigInt, getPythDecimals } from "../../../../../helpers";
import type { Round } from "../../../../../types";
import { useAssetPrice } from "../../hooks/useAssetPrice";
import { getCurrentTrend, getPositionLabel } from "./round-utils";

interface LivePriceDisplayProps {
  readonly round: Round;
}

export default function LivePriceDisplay({ round }: Readonly<LivePriceDisplayProps>) {
  const t = useTranslations("prediction");
  const priceData = useAssetPrice(round.asset);

  const { currentPrice, livePercentChange, trend } = useMemo(() => {
    const price = numberPriceToBigInt(
      priceData?.price || 0,
      getPythDecimals(round.asset)
    );
    const lockPriceNum = Number(round.lockPrice);
    const currentPriceNum = Number(price || round.closePrice);
    const percentChange =
      lockPriceNum > 0
        ? ((currentPriceNum - lockPriceNum) / lockPriceNum) * 100
        : 0;
    return {
      currentPrice: price,
      livePercentChange: percentChange,
      trend: getCurrentTrend(round.lockPrice, price || round.closePrice),
    };
  }, [priceData?.price, round.asset, round.lockPrice, round.closePrice]);

  const trendColorMap: Record<string, string> = {
    UP: "text-primary",
    DOWN: "text-destructive",
  };
  const trendColor = trendColorMap[trend.direction] ?? "text-muted-foreground";

  const trendVariantMap: Record<string, "default" | "destructive" | "outline"> = {
    UP: "default",
    DOWN: "destructive",
  };
  const trendVariant = trendVariantMap[trend.direction] ?? "outline";

  return (
    <div className="space-y-2 pt-2 border-t border-border/40">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground space-y-1">
          <div>
            <span className="opacity-60">{t("rounds.round_card.lock_price_label")}</span>{" "}
            <span className="text-foreground/80">${priceToString(round.lockPrice, round.asset)}</span>
          </div>
          <div>
            <span className="opacity-60">{t("rounds.round_card.now_price_label")}</span>{" "}
            <span className="text-foreground/80">${priceToString(currentPrice, round.asset)}</span>
          </div>
        </div>
        <div className={`text-lg font-bold font-mono flex items-center shrink-0 ${trendColor}`}>
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
        <Badge variant={trendVariant} className="animate-pulse text-xs">
          {trend.direction === "UP" && "↑ "}
          {trend.direction === "DOWN" && "↓ "}
          {getPositionLabel(t, trend.direction)}
        </Badge>
      </div>
    </div>
  );
}
