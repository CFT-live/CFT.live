"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Users, Skull, Zap } from "lucide-react";
import { weiToUsdc } from "@/app/helpers";
import { Table, TablePlayer } from "@/app/features/roulette/v1/queries/roulette.types";
import { cn } from "@/lib/utils";

export const PlayerList = ({
  table,
  currentUserAddress,
}: {
  table: Table;
  currentUserAddress?: string;
}) => {
  const t = useTranslations("roulette");

  const getPlayerStatusLabel = (status: string) => {
    if (status === "Dead") return t("player_status_dead");
    if (status === "Playing") return t("player_status_playing");
    if (status === "Joined") return t("player_status_joined");
    return status;
  };

  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-950/55 p-3 sm:p-4 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm sm:text-base font-semibold">
          <Users className="h-4 w-4 sm:h-5 sm:w-5" />
          {t("player_list_title")}
        </div>
        <div className="text-[10px] sm:text-xs text-muted-foreground">
          {table.players.length}/{table.maxPlayers}
        </div>
      </div>

      <div className="mt-3 space-y-2">
          {table.players.map((player: TablePlayer, idx: number) => {
            const isCurrentTurn =
              table.status === "InProgress" && idx === table.currentPlayerIndex;
            const isYou =
              currentUserAddress?.toLowerCase() === player.user.id.toLowerCase();
            const isDead = player.status === "Dead";

            let containerClass = "border-border/40 bg-background/20";
            if (isCurrentTurn) {
              containerClass = "border-primary/70 bg-primary/10 shadow-[0_0_12px_hsl(23_100%_50%/0.15)]";
            } else if (isDead) {
              containerClass = "border-red-500/20 bg-red-950/10 opacity-60";
            }

            let avatarClass = "bg-gray-500/10 text-gray-500";
            if (isDead) {
              avatarClass = "bg-red-500/20 text-red-500";
            } else if (isCurrentTurn) {
              avatarClass = "bg-primary/20 text-primary shadow-[0_0_8px_hsl(23_100%_50%/0.3)]";
            } else if (player.status === "Playing") {
              avatarClass = "bg-green-500/10 text-green-500";
            }

            let statusClass = "text-gray-500";
            if (isDead) {
              statusClass = "text-red-500";
            } else if (player.status === "Playing") {
              statusClass = "text-green-500";
            }

            return (
              <div
                key={player.id}
                className={cn(
                  "rounded-md px-2.5 py-2 sm:px-3 sm:py-2.5 border transition-all duration-200",
                  containerClass
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    {/* Avatar with status-based styling */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all",
                        avatarClass
                      )}
                    >
                      {isDead ? <Skull className="h-4 w-4" /> : idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <p className={cn(
                          "font-semibold text-xs sm:text-sm truncate",
                          isDead && "line-through text-red-500/70"
                        )}>
                          {player.user.id.slice(0, 6)}...{player.user.id.slice(-4)}
                        </p>
                        {isYou && (
                          <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-1.5 border-primary/50 text-primary">
                            {t("badge_you")}
                          </Badge>
                        )}
                        {isCurrentTurn && (
                          <Badge
                            variant="default"
                            className="text-[10px] sm:text-xs px-1 sm:px-1.5 shadow-[0_0_6px_hsl(23_100%_50%/0.4)]"
                          >
                            <Zap className="h-2.5 w-2.5 mr-0.5" />
                            {t("badge_turn")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-0.5 sm:mt-1">
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          <span className={cn("font-semibold", statusClass)}>
                            {getPlayerStatusLabel(player.status)}
                          </span>
                        </p>
                        {table.status === "Open" && (
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            <span
                              className={
                                player.isReady
                                  ? "text-green-500"
                                  : "text-gray-500"
                              }
                            >
                              {player.isReady
                                ? t("player_ready_yes")
                                : t("player_ready_no")}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] sm:text-sm text-muted-foreground">
                      {t("player_bets_label")}
                    </p>
                    <p className={cn(
                      "text-sm sm:text-lg font-bold",
                      isDead && "text-red-500/60"
                    )}>
                      ${weiToUsdc(player.totalBetAmount ?? "0").toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
