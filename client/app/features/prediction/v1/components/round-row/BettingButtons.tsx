"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { MILLIS } from "../../../../../helpers";
import type { Position, Round } from "../../../../../types";
import { useNow } from "../../hooks/useNow";

interface BettingButtonsProps {
  readonly round: Round;
  readonly openBetDialog: (position: Position, roundId: string, amount?: string) => void;
}

export default function BettingButtons({
  round,
  openBetDialog,
}: Readonly<BettingButtonsProps>) {
  const t = useTranslations("prediction");
  const now = useNow();

  const isDisabled = useMemo(() => {
    const lockTime = Number.parseInt(round.lockAt) * MILLIS.inSecond;
    const closeTime = Number.parseInt(round.closeAt) * MILLIS.inSecond;
    return now >= lockTime || now >= closeTime;
  }, [now, round.lockAt, round.closeAt]);

  return (
    <div className="space-y-2 pt-2">
      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={() => openBetDialog("UP", round.id)}
          className="w-full text-xs sm:text-sm font-bold"
          disabled={isDisabled}
        >
          {t("rounds.positions.up_with_arrow")}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => openBetDialog("DOWN", round.id)}
          className="w-full text-xs sm:text-sm font-bold"
          disabled={isDisabled}
        >
          {t("rounds.positions.down_with_arrow")}
        </Button>
      </div>
      {/* Quick-bet chips */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[9px] text-muted-foreground/50">
          {t("rounds.bet_dialog.quick_amounts")}
        </span>
        <div className="flex justify-center gap-1">
          {["1", "5", "10"].map((val) => (
            <button
              key={val}
              type="button"
              disabled={isDisabled}
              onClick={() => openBetDialog("UP", round.id, val)}
              className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-40"
            >
              ${val}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
