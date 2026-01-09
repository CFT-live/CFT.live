"use client";

import { useQuery } from "@tanstack/react-query";
import { request } from "graphql-request";
import { useAppKitAccount } from "@reown/appkit/react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ROULETTE_USER_ACTIVE_TABLES_QUERY_KEY } from "@/app/queries/keys";
import { getUserActiveTablesQuery } from "@/app/queries/roulette";
import { DEFAULT_HEADERS } from "@/app/queries/headers";
import { REFRESH_INTERVAL_MILLIS, weiToUsdc } from "@/app/helpers";
import { AlertCircle } from "lucide-react";
import { CardTemplate } from "../CardTemplate";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePlayer } from "@/app/queries/roulette.types";

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
              className={`w-full text-left p-3 sm:p-4 border rounded-lg cursor-pointer transition-all ${
                isYourTurn ? "border-primary bg-primary/5" : "border-border"
              } ${
                selectedTableId === table.id
                  ? "ring-2 ring-primary shadow-md"
                  : "hover:shadow-sm"
              }`}
              onClick={() => handleTableClick(table.id)}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                    <h4 className="font-bold text-sm sm:text-base">
                      {t("table_label")} #{table.id}
                    </h4>
                    <Badge variant={getBadgeVariant()} className="text-xs">
                      {getStatusLabel(table.status)}
                    </Badge>
                    {isYourTurn && (
                      <Badge variant="destructive" className="animate-pulse text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {t("active_table_your_turn")}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:text-sm mb-2 sm:mb-3">
                    <div>
                      <span className="text-muted-foreground">
                        {t("active_table_field_pot")}{" "}
                      </span>
                      <span className="font-semibold">
                        ${weiToUsdc(table.totalPool)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {t("active_table_field_bet")}{" "}
                      </span>
                      <span className="font-semibold">
                        ${weiToUsdc(table.currentBetAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {t("active_table_field_your_bets")}{" "}
                      </span>
                      <span className="font-semibold">
                        ${weiToUsdc(tablePlayer.totalBetAmount ?? "0")}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {t("active_table_field_players")}{" "}
                      </span>
                      <span className="font-semibold">
                        {table.players.length}
                      </span>
                    </div>
                  </div>

                  {table.status === "Open" && !tablePlayer.isReady && (
                    <p className="text-xs sm:text-sm text-muted-foreground">
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
