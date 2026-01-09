"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { request } from "graphql-request";
import { useTranslations } from "next-intl";
import { useAppKitAccount } from "@reown/appkit/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ROULETTE_IN_PROGRESS_TABLES_QUERY_KEY,
  ROULETTE_OPEN_TABLES_QUERY_KEY,
} from "@/app/queries/keys";
import { getInProgressTablesQuery, getOpenTablesQuery } from "@/app/queries/roulette";
import { DEFAULT_HEADERS } from "@/app/queries/headers";
import { REFRESH_INTERVAL_MILLIS, weiToUsdc } from "@/app/helpers";
import { Users } from "lucide-react";
import { CreateTableDialog } from "./CreateTableDialog";
import {
  GetInProgressTablesResponse,
  GetOpenTablesResponse,
  TableStatus,
} from "@/app/queries/roulette.types";
import { CardTemplate } from "../CardTemplate";
import { Skeleton } from "@/components/ui/skeleton";

type RouletteTranslator = ReturnType<typeof useTranslations>;

const formatRelativeTimeFromSeconds = (
  t: RouletteTranslator,
  unixSeconds: string
): {
  label: string;
  full: string;
} => {
  const seconds = Number(unixSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return { label: "-", full: "-" };
  }

  const createdDate = new Date(seconds * 1000);
  const full = createdDate.toLocaleString();
  const diffSeconds = Math.max(0, Math.floor((Date.now() - createdDate.getTime()) / 1000));

  if (diffSeconds < 60) {
    return { label: t("time_seconds_ago", { count: diffSeconds }), full };
  }

  if (diffSeconds < 60 * 60) {
    return {
      label: t("time_minutes_ago", { count: Math.floor(diffSeconds / 60) }),
      full,
    };
  }

  if (diffSeconds < 24 * 60 * 60) {
    return {
      label: t("time_hours_ago", { count: Math.floor(diffSeconds / 3600) }),
      full,
    };
  }

  return {
    label: createdDate.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    full,
  };
};

export const OpenTables: React.FC = () => {
  const t = useTranslations("roulette");
  const { address } = useAppKitAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const selectedTableId = searchParams.get("tableId");

  const [selectedList, setSelectedList] = useState<"open" | "playing">("open");

  const handleTableClick = useCallback(
    (tableId: string) => {
      const params = new URLSearchParams(searchParams);
      params.set("tableId", tableId);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const {
    data: openTablesData,
    isLoading: openTablesIsLoading,
    refetch: openTablesRefetch,
  } = useQuery<GetOpenTablesResponse>({
    queryKey: [ROULETTE_OPEN_TABLES_QUERY_KEY],
    queryFn: async () => {
      return await request(
        process.env.NEXT_PUBLIC_ROULETTE_THE_GRAPH_API_URL!,
        getOpenTablesQuery,
        { first: 20, skip: 0 },
        DEFAULT_HEADERS
      );
    },
    staleTime: REFRESH_INTERVAL_MILLIS.medium,
    refetchInterval: REFRESH_INTERVAL_MILLIS.medium,
  });

  const {
    data: inProgressTablesData,
    isLoading: inProgressTablesIsLoading,
    refetch: inProgressTablesRefetch,
  } = useQuery<GetInProgressTablesResponse>({
    queryKey: [ROULETTE_IN_PROGRESS_TABLES_QUERY_KEY],
    queryFn: async () => {
      return await request(
        process.env.NEXT_PUBLIC_ROULETTE_THE_GRAPH_API_URL!,
        getInProgressTablesQuery,
        { first: 20, skip: 0 },
        DEFAULT_HEADERS
      );
    },
    staleTime: REFRESH_INTERVAL_MILLIS.medium,
    refetchInterval: REFRESH_INTERVAL_MILLIS.medium,
  });

  const openTables = useMemo(() => openTablesData?.tables ?? [], [openTablesData?.tables]);
  const playingTables = useMemo(
    () => inProgressTablesData?.tables ?? [],
    [inProgressTablesData?.tables]
  );

  const activeTables = selectedList === "open" ? openTables : playingTables;
  const isActiveLoading =
    selectedList === "open" ? openTablesIsLoading : inProgressTablesIsLoading;
  const isActiveEmpty = activeTables.length === 0;

  const emptyMessage =
    selectedList === "open"
      ? t("tables_empty_open")
      : t("tables_empty_playing");

  const gridContent =
    selectedList === "open" ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {openTables.map((table) => {
          const isPlayerInTable = table.players.some(
            (p) => p.user.id.toLowerCase() === address?.toLowerCase()
          );
          const readyCount = table.players.filter((p) => p.isReady).length;
          const createdAt = formatRelativeTimeFromSeconds(t, table.createdAt);

          return (
            <Card
              key={table.id}
              role="button"
              tabIndex={0}
              className={`relative transition-shadow cursor-pointer ${
                selectedTableId === table.id
                  ? "ring-2 ring-primary shadow-md"
                  : "hover:shadow-md"
              }`}
              onClick={() => handleTableClick(table.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleTableClick(table.id);
                }
              }}
            >
              <CardContent className="p-4 sm:pt-6">
                <div className="flex justify-between items-start mb-3 sm:mb-4">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg">
                      {t("table_label")} #{table.id}
                    </h3>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {t("table_status_open")}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:space-y-2 sm:block mb-3 sm:mb-4">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">
                      {t("table_field_created")}
                    </span>
                    <span className="font-semibold" title={createdAt.full}>
                      {createdAt.label}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">
                      {t("table_field_initial_bet")}
                    </span>
                    <span className="font-semibold">
                      ${weiToUsdc(table.initialBetAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">
                      {t("table_field_max_incr")}
                    </span>
                    <span className="font-semibold">${weiToUsdc(table.maxIncrement)}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">
                      {t("table_field_players")}
                    </span>
                    <span className="font-semibold">
                      {table.players.length}/{table.maxPlayers}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">
                      {t("table_field_ready")}
                    </span>
                    <span className="font-semibold">
                      {readyCount}/{table.players.length}
                    </span>
                  </div>
                </div>

                {isPlayerInTable && (
                  <Badge variant="secondary" className="mb-2 text-xs">
                    {t("table_badge_youre_in")}
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {playingTables.map((table) => {
          const isPlayerInTable = table.players.some(
            (p) => p.user.id.toLowerCase() === address?.toLowerCase()
          );
          const createdAt = formatRelativeTimeFromSeconds(t, table.createdAt);

          let statusLabel: string = table.status;
          if (table.status === TableStatus.InProgress) {
            statusLabel = t("table_status_in_progress");
          }

          if (table.status === TableStatus.WaitingRandom) {
            statusLabel = t("table_status_waiting_rng");
          }

          return (
            <Card
              key={table.id}
              role="button"
              tabIndex={0}
              className={`relative transition-shadow cursor-pointer ${
                selectedTableId === table.id
                  ? "ring-2 ring-primary shadow-md"
                  : "hover:shadow-md"
              }`}
              onClick={() => handleTableClick(table.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleTableClick(table.id);
                }
              }}
            >
              <CardContent className="p-4 sm:pt-6">
                <div className="flex justify-between items-start mb-3 sm:mb-4">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg">
                      {t("table_label")} #{table.id}
                    </h3>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {statusLabel}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:space-y-2 sm:block mb-3 sm:mb-4">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">
                      {t("table_field_created")}
                    </span>
                    <span className="font-semibold" title={createdAt.full}>
                      {createdAt.label}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">
                      {t("table_field_initial_bet")}
                    </span>
                    <span className="font-semibold">
                      ${weiToUsdc(table.initialBetAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">
                      {t("table_field_max_incr")}
                    </span>
                    <span className="font-semibold">${weiToUsdc(table.maxIncrement)}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">
                      {t("table_field_players")}
                    </span>
                    <span className="font-semibold">
                      {table.players.length}/{table.maxPlayers}
                    </span>
                  </div>
                </div>

                {isPlayerInTable && (
                  <Badge variant="secondary" className="mb-2 text-xs">
                    {t("table_badge_youre_in")}
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );

  const body = (() => {
    if (isActiveLoading && isActiveEmpty) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      );
    }

    if (isActiveEmpty) {
      return (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">{emptyMessage}</p>
          {selectedList === "open" && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              {t("tables_create")}
            </Button>
          )}
        </div>
      );
    }

    return gridContent;
  })();

  return (
    <>
      <CardTemplate
        title={t("tables_title")}
        description={t("tables_description")}
        isRefreshing={isActiveLoading}
        refresh={async () => {
          await Promise.all([openTablesRefetch(), inProgressTablesRefetch()]);
        }}
      >
        <div className="flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="inline-flex w-full sm:w-auto border-b border-border pb-2 gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  "flex-1 sm:flex-initial justify-center rounded-md border text-xs sm:text-sm",
                  selectedList === "open"
                    ? "border-primary bg-background text-primary shadow-sm"
                    : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
                aria-pressed={selectedList === "open"}
                onClick={() => setSelectedList("open")}
              >
                {t("tables_list_open")} ({openTables.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  "flex-1 sm:flex-initial justify-center rounded-md border text-xs sm:text-sm",
                  selectedList === "playing"
                    ? "border-primary bg-background text-primary shadow-sm"
                    : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
                aria-pressed={selectedList === "playing"}
                onClick={() => setSelectedList("playing")}
              >
                {t("tables_list_spectate")} ({playingTables.length})
              </Button>
            </div>

            <Button
              className="self-stretch sm:self-auto"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              {t("tables_create_new")}
            </Button>
          </div>

          {body}
        </div>
      </CardTemplate>
      <CreateTableDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </>
  );
};
