"use client";

import { useTranslations } from "next-intl";
import { priceToString } from "../../../../../helpers";
import type { Round } from "../../../../../types";

interface PayoutDisplayProps {
  readonly round: Round;
  readonly isOpen: boolean;
}

export default function PayoutDisplay({ round, isOpen }: Readonly<PayoutDisplayProps>) {
  const t = useTranslations("prediction");
  const upPayout = priceToString(round.payoutUp, 18, 2);
  const downPayout = priceToString(round.payoutDown, 18, 2);

  if (isOpen) {
    return (
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="text-center py-2.5 px-1.5 bg-primary/5 rounded-lg border border-primary/15 backdrop-blur-sm">
          <div className="text-[10px] text-primary/70 uppercase tracking-wider font-medium mb-0.5">
            {t("rounds.round_card.up_wins")}
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-primary font-mono leading-tight">
            x{upPayout}
          </div>
        </div>
        <div className="text-center py-2.5 px-1.5 bg-destructive/5 rounded-lg border border-destructive/15 backdrop-blur-sm">
          <div className="text-[10px] text-destructive/70 uppercase tracking-wider font-medium mb-0.5">
            {t("rounds.round_card.down_wins")}
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-destructive font-mono leading-tight">
            x{downPayout}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-3 mt-2 pt-2 border-t border-border/40">
      <span className="text-sm font-semibold text-primary font-mono">↑ x{upPayout}</span>
      <span className="text-muted-foreground/50">|</span>
      <span className="text-sm font-semibold text-destructive font-mono">↓ x{downPayout}</span>
    </div>
  );
}
