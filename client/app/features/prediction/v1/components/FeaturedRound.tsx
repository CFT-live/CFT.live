"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MILLIS, priceToString, weiToUsdcString } from "../../../../helpers";
import type { Position, Round } from "../../../../types";
import { useNow } from "../hooks/useNow";
import { useAssetPrice } from "../hooks/useAssetPrice";
import PoolRatioBar from "./round-row/PoolRatioBar";
import UserRoundBets from "./round-row/UserRoundBets";

interface FeaturedRoundProps {
  readonly rounds: Round[];
  readonly openBetDialog: (position: Position, roundId: string, amount?: string) => void;
}

export function FeaturedRound({ rounds, openBetDialog }: FeaturedRoundProps) {
  const now = useNow();

  // Pick the "hottest" open round: soonest to lock (> 30s remaining), tiebreak by highest volume
  const featured = useMemo(() => {
    const eligible = rounds.filter((r) => {
      const lockTime = Number.parseInt(r.lockAt) * MILLIS.inSecond;
      return lockTime - now > 30 * MILLIS.inSecond;
    });
    if (!eligible.length) return null;
    const sorted = [...eligible].sort((a, b) => {
      const aLock = Number.parseInt(a.lockAt);
      const bLock = Number.parseInt(b.lockAt);
      if (aLock !== bLock) return aLock - bLock; // soonest first
      return Number(b.totalAmount) - Number(a.totalAmount); // then highest volume
    });
    return sorted[0];
  }, [rounds, now]);

  if (!featured) return null;

  return <FeaturedRoundCard round={featured} openBetDialog={openBetDialog} />;
}

function FeaturedRoundCard({
  round,
  openBetDialog,
}: Readonly<{
  round: Round;
  openBetDialog: (position: Position, roundId: string, amount?: string) => void;
}>) {
  const t = useTranslations("prediction");
  const now = useNow();
  const priceData = useAssetPrice(round.asset);

  const lockTime = Number.parseInt(round.lockAt) * MILLIS.inSecond;
  const remaining = lockTime - now;

  // Countdown display
  const countdown = useMemo(() => {
    if (remaining <= 0) return "0s";
    const mins = Math.floor(remaining / MILLIS.inMinute);
    const secs = Math.floor((remaining % MILLIS.inMinute) / MILLIS.inSecond);
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }, [remaining]);

  // Urgency color
  const getUrgencyColor = () => {
    if (remaining <= 2 * MILLIS.inMinute) return "text-destructive";
    if (remaining <= 5 * MILLIS.inMinute) return "text-amber-500";
    return "text-primary";
  };
  const urgencyColor = getUrgencyColor();

  const upPayout = priceToString(round.payoutUp, 18, 2);
  const downPayout = priceToString(round.payoutDown, 18, 2);

  const isDisabled = remaining <= 0;

  return (
    <Card className="border-primary/30 bg-linear-to-r from-primary/5 via-background to-destructive/5 overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        {/* Top row: badge + asset + countdown */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs font-bold">
              {t("featured_round.hot")}
            </Badge>
            <span className="text-2xl font-bold">{round.asset}</span>
            <span className="text-sm text-muted-foreground font-mono">
              #{round.id}
            </span>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {t("featured_round.locks_in")}
            </div>
            <div className={`text-xl font-bold font-mono ${urgencyColor}`}>
              {countdown}
            </div>
          </div>
        </div>

        {/* Middle: payouts + live price + pool */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {/* Payouts */}
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center py-2 bg-primary/5 rounded-lg border border-primary/15">
              <div className="text-[10px] text-primary/70 uppercase tracking-wider">
                {t("rounds.round_card.up_wins")}
              </div>
              <div className="text-2xl font-bold text-primary font-mono">
                x{upPayout}
              </div>
            </div>
            <div className="text-center py-2 bg-destructive/5 rounded-lg border border-destructive/15">
              <div className="text-[10px] text-destructive/70 uppercase tracking-wider">
                {t("rounds.round_card.down_wins")}
              </div>
              <div className="text-2xl font-bold text-destructive font-mono">
                x{downPayout}
              </div>
            </div>
          </div>

          {/* Live price */}
          <div className="flex flex-col items-center justify-center">
            {priceData?.price && (
              <>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {t("featured_round.live_price")}
                </div>
                <div className="text-xl font-bold font-mono">
                  ${priceData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </>
            )}
          </div>

          {/* Volume + pool */}
          <div className="flex flex-col justify-center gap-1.5">
            <div className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">
                ${weiToUsdcString(round.totalAmount)}
              </span>{" "}
              {t("rounds.round_card.volume_abbrev")} ·{" "}
              {t("rounds.round_card.bets_count", { count: round.totalBetsCount })}
            </div>
            <PoolRatioBar
              upAmount={Number(round.upAmount)}
              downAmount={Number(round.downAmount)}
            />
          </div>
        </div>

        {/* Bottom: action buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="grid grid-cols-2 gap-2 flex-1">
            <Button
              size="lg"
              variant="default"
              onClick={() => openBetDialog("UP", round.id)}
              className="font-bold text-base"
              disabled={isDisabled}
            >
              {t("rounds.positions.up_with_arrow")}
            </Button>
            <Button
              size="lg"
              variant="destructive"
              onClick={() => openBetDialog("DOWN", round.id)}
              className="font-bold text-base"
              disabled={isDisabled}
            >
              {t("rounds.positions.down_with_arrow")}
            </Button>
          </div>
          {/* Quick bets */}
          <div className="flex flex-col items-center sm:items-start gap-0.5">
            <span className="text-[9px] text-muted-foreground/50">
              {t("rounds.bet_dialog.quick_amounts")}
            </span>
            <div className="flex items-center gap-1 justify-center sm:justify-start">
              {["1", "5", "10"].map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => openBetDialog("UP", round.id, val)}
                  className="text-xs px-2.5 py-1.5 rounded border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-40 font-mono"
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>
        </div>

        <UserRoundBets roundId={round.id} roundStatus="OPEN" />
      </CardContent>
    </Card>
  );
}
