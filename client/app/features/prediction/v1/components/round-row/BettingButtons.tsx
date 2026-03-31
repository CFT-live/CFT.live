"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { MILLIS } from "../../../../../helpers";
import type { Position, Round } from "../../../../../types";
import { useNow } from "../../hooks/useNow";

interface BettingButtonsProps {
  readonly round: Round;
  readonly openBetDialog: (position: Position, roundId: string) => void;
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
    <div className="grid grid-cols-2 gap-2 pt-2">
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
  );
}
