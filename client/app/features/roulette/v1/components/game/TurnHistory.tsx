"use client";

import { useTranslations } from "next-intl";
import { Clock, Skull, CheckCircle } from "lucide-react";
import { weiToUsdc } from "@/app/helpers";
import { Turn } from "@/app/features/roulette/v1/queries/roulette.types";

export const TurnHistory = ({ turns }: Readonly<{ turns: Turn[] }>) => {
  const t = useTranslations("roulette");
  if (!turns || turns.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-950/55 p-3 sm:p-4 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm sm:text-base font-semibold">
          <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
          {t("turn_history_title")}
        </div>
        <div className="text-[10px] sm:text-xs text-muted-foreground">
          {turns.length}
        </div>
      </div>

      <div className="mt-3 space-y-2">
          {[...turns].reverse().map((turn) => {
            const eliminated = turn.playerRandom === turn.serverRandom;

            return (
              <div
                key={turn.id}
                className={`rounded-md px-2.5 py-2 sm:px-3 sm:py-2.5 border ${
                  eliminated
                    ? "border-red-500/40 bg-red-500/10"
                    : "border-border/40 bg-background/20"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="text-lg sm:text-2xl shrink-0">
                      {eliminated ? (
                        <Skull className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs sm:text-sm truncate">
                        {t("turn_history_turn_line", {
                          turnNumber: turn.turnNumber ?? 0,
                          player: `${turn.player.id.slice(0, 6)}...${turn.player.id.slice(-4)}`,
                        })}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-sm text-muted-foreground">
                        <span>
                          {t("turn_history_bet", {
                            amount: weiToUsdc(turn.betAmount).toFixed(2),
                          })}
                        </span>
                        <span>
                          {t("turn_history_player_random", {
                            value: turn.playerRandom,
                          })}
                        </span>
                        <span>
                          {t("turn_history_server_random", {
                            value: turn.serverRandom ?? '-',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
