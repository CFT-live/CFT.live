"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { priceToString } from "../../../../../helpers";
import type { Asset } from "../../../../../types";
import { formatPercentage, getPositionLabel, getPositionVariant } from "./round-utils";

interface PriceMovementDisplayProps {
  readonly asset: Asset;
  readonly lockPrice: bigint;
  readonly closePrice: bigint;
  readonly priceChangePercent?: string;
  readonly finalPosition?: string;
}

export default function PriceMovementDisplay({
  asset,
  lockPrice,
  closePrice,
  priceChangePercent,
  finalPosition,
}: Readonly<PriceMovementDisplayProps>) {
  const t = useTranslations("prediction");
  const percentChange = priceChangePercent ? Number.parseFloat(priceChangePercent) : 0;
  const isUp = percentChange > 0;
  const isDown = percentChange < 0;

  let percentColor = "text-muted-foreground";
  if (isUp) percentColor = "text-primary";
  else if (isDown) percentColor = "text-destructive";

  return (
    <div className="space-y-2 pt-2 border-t border-border/40">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground space-y-1">
          <div>
            <span className="opacity-60">{t("rounds.round_card.lock_price_label")}</span>{" "}
            <span className="text-foreground/80">${priceToString(lockPrice, asset)}</span>
          </div>
          <div>
            <span className="opacity-60">{t("rounds.round_card.close_price_label")}</span>{" "}
            <span className="text-foreground/80">${priceToString(closePrice, asset)}</span>
          </div>
        </div>
        {priceChangePercent && (
          <div className={`text-lg font-bold font-mono flex items-center shrink-0 ${percentColor}`}>
            {isUp && <span>↑</span>}
            {isDown && <span>↓</span>}
            <span>
              {isUp ? "+" : ""}
              {formatPercentage(priceChangePercent)}%
            </span>
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
}
