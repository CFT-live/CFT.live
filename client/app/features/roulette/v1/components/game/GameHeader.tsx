"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Target, Users } from "lucide-react";
import { weiToUsdc } from "@/app/helpers";
import { Table } from "@/app/features/roulette/v1/queries/roulette.types";
import { cn } from "@/lib/utils";

export const GameHeader = ({ table }: Readonly<{ table: Table }>) => {
  const t = useTranslations("roulette");
  let statusVariant: "default" | "secondary" | "outline" | "destructive" =
    "default";

  if (table.status === "Open") {
    statusVariant = "secondary";
  } else if (table.status === "Finished") {
    statusVariant = "outline";
  } else if (table.status !== "InProgress") {
    statusVariant = "destructive";
  }

  const isLive = table.status === "InProgress" || table.status === "WaitingRandom";

  const getStatusLabel = (status: string) => {
    if (status === "Open") return t("table_status_open");
    if (status === "InProgress") return t("table_status_in_progress");
    if (status === "WaitingRandom") return t("table_status_waiting_rng");
    if (status === "Finished") return t("table_status_finished");
    if (status === "Cancelled") return t("table_status_cancelled");
    return status;
  };

  return (
    <div className={cn(
      "rounded-lg border bg-zinc-950/55 px-3 py-3 sm:px-4 sm:py-4 shadow-[0_8px_24px_rgba(0,0,0,0.3)]",
      isLive ? "border-primary/30" : "border-zinc-700/50"
    )}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg sm:text-2xl font-bold tracking-tight">
              {t("table_label")} #{table.id}
            </h2>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {table.creator.id.slice(0, 6)}...{table.creator.id.slice(-4)}
          </p>
        </div>
        <Badge
          variant={statusVariant}
          className={cn(
            "text-xs sm:text-sm px-2 sm:px-3 py-0.5 self-start",
            isLive && "animate-pulse shadow-[0_0_8px_hsl(23_100%_50%/0.3)]"
          )}
        >
          {isLive && <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 inline-block" />}
          {getStatusLabel(table.status)}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:gap-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {t("game_header_total_pot")}
              </p>
              <p className="text-base sm:text-xl font-bold truncate text-green-500">
                ${weiToUsdc(table.totalPool).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {t("game_header_min_bet")}
              </p>
              <p className="text-base sm:text-xl font-bold truncate">
                ${weiToUsdc(table.currentBetAmount).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {t("game_header_players")}
              </p>
              <p className="text-base sm:text-xl font-bold">
                {table.players.length} / {table.maxPlayers}
              </p>
            </div>
          </div>
      </div>
    </div>
  );
};
