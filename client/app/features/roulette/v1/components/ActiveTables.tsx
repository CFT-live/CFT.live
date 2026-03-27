"use client";

import { useQuery } from "@tanstack/react-query";
import { request } from "graphql-request";
import { useAppKitAccount } from "@reown/appkit/react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ROULETTE_USER_ACTIVE_TABLES_QUERY_KEY } from "../queries/keys";
import { getUserActiveTablesQuery } from "@/app/features/roulette/v1/queries/roulette";
import { DEFAULT_HEADERS } from "@/app/queries/headers";
import { REFRESH_INTERVAL_MILLIS, weiToUsdc } from "@/app/helpers";
import { AlertCircle, DollarSign, Target, Users } from "lucide-react";
import { CardTemplate } from "@/app/features/root/v1/components/CardTemplate";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePlayer } from "@/app/features/roulette/v1/queries/roulette.types";
import { cn } from "@/lib/utils";

export const ActiveTables: React.FC = () => {
  const t = useTranslations("roulette");
  const { address } = useAppKitAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTableId = searchParams.get("tableId");

  const getStatusLabel = (status: string) => {
    if (status === "Open") return t("table_status_open");
    if (status === "InProgress") return t("table_status_in_progress");
    if (status === "WaitingRandom") return t("table_status_waiting_rng");
    if (status === "Finished") return t("table_status_finished");
    return status;
  };

  const handleTableClick = useCallback(
    (tableId: string) => {
      const params = new URLSearchParams(searchParams);
      params.set("tableId", tableId);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: [ROULETTE_USER_ACTIVE_TABLES_QUERY_KEY, address],
    queryFn: async () => {
      if (!address) return null;
      return await request(
        process.env.NEXT_PUBLIC_ROULETTE_THE_GRAPH_API_URL!,
        getUserActiveTablesQuery,
        { user: address.toLowerCase() },
        DEFAULT_HEADERS
      );
    },
    enabled: Boolean(address),
    staleTime: REFRESH_INTERVAL_MILLIS.short,
    refetchInterval: REFRESH_INTERVAL_MILLIS.short,
  });

  const activeTables = useMemo(
    () =>
      (data?.tablePlayers || []).filter((tablePlayer: TablePlayer) => {
        if (!address) return false;
        const table = tablePlayer.table;
        if (table.status === "Finished") {
          if (table.winner) {
            if (table.winner.toLowerCase() !== address.toLowerCase()) {
              return false;
            }
            // Include finished tables only if the user hasn't claimed their payout yet
            return !table.payoutClaimed;
          }
        }
        return true;
      }),
    [data?.tablePlayers, address]
  );

  // Auto-select the first table if none is selected and there are active tables
  useEffect(() => {
    if (activeTables.length > 0 && !selectedTableId) {
      const firstTableId = activeTables[0].table.id;
      const params = new URLSearchParams(searchParams);
      params.set("tableId", firstTableId);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [activeTables, selectedTableId, searchParams, router]);

  if (!address) {
    return null;
  }

  if (isLoading) {
    return (
      <CardTemplate
        title={t("active_tables_title")}
        description={t("active_tables_description")}
        isRefreshing={true}
        refresh={refetch}
      >
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </CardTemplate>
    );
  }

  if (activeTables.length === 0) {
    return null;
  }

  return (
    <CardTemplate
      title={t("active_tables_title")}
      description={t("active_tables_description")}
      isRefreshing={isLoading}
      refresh={refetch}
    >
      <div className="space-y-2 sm:space-y-3">
        {activeTables.map((tablePlayer: TablePlayer) => {
          const table = tablePlayer.table;
          const isYourTurn =
            table.status === "InProgress" &&
            table.players[table.currentPlayerIndex ?? -1]?.user.id.toLowerCase() ===
              address.toLowerCase();

          const getBadgeVariant = () => {
            if (table.status === "InProgress") return "default";
            if (table.status === "WaitingRandom") return "secondary";
            return "outline";
          };

          return (
            <button
              key={tablePlayer.id}
              type="button"
              className={cn(
                "w-full text-left p-3 sm:p-4 border rounded-lg cursor-pointer transition-all duration-200",
                isYourTurn
                  ? "animate-pulse-border bg-primary/5"
                  : "border-border hover:border-primary/40",
                selectedTableId === table.id
                  ? "ring-2 ring-primary shadow-[0_0_20px_hsl(23_100%_50%/0.15)]"
                  : "hover:shadow-[0_0_12px_hsl(23_100%_50%/0.08)]"
              )}
              onClick={() => handleTableClick(table.id)}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                    <h4 className="font-bold text-sm sm:text-base">
                      {t("table_label")} #{table.id}
                    </h4>
                    <Badge variant={getBadgeVariant()} className={cn(
                      "text-[10px] sm:text-xs",
                      table.status === "WaitingRandom" && "animate-pulse"
                    )}>
                      {getStatusLabel(table.status)}
                    </Badge>
                    {isYourTurn && (
                      <Badge variant="destructive" className="text-[10px] sm:text-xs shadow-[0_0_10px_hsl(3_85%_46%/0.4)]">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {t("active_table_your_turn")}
                      </Badge>
                    )}
                  </div>

                  {/* Stats row with icons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3 w-3 text-green-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground leading-none">{t("active_table_field_pot")}</p>
                        <p className="text-xs sm:text-sm font-bold text-green-500">${weiToUsdc(table.totalPool)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3 w-3 text-primary shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground leading-none">{t("active_table_field_bet")}</p>
                        <p className="text-xs sm:text-sm font-bold">${weiToUsdc(table.currentBetAmount)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3 w-3 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground leading-none">{t("active_table_field_your_bets")}</p>
                        <p className="text-xs sm:text-sm font-bold">${weiToUsdc(tablePlayer.totalBetAmount ?? "0")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground leading-none">{t("active_table_field_players")}</p>
                        <p className="text-xs sm:text-sm font-bold">{table.players.length}</p>
                      </div>
                    </div>
                  </div>

                  {table.status === "Open" && !tablePlayer.isReady && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                      {t("active_table_waiting_ready")}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </CardTemplate>
  );
};
