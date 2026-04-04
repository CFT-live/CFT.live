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
} from "../queries/keys";
import { getInProgressTablesQuery, getOpenTablesQuery } from "@/app/features/roulette/v1/queries/roulette";
import { DEFAULT_HEADERS } from "@/app/queries/headers";
import { REFRESH_INTERVAL_MILLIS, weiToUsdc } from "@/app/helpers";
import { Users, Plus, DollarSign, TrendingUp } from "lucide-react";
import { CreateTableDialog } from "./CreateTableDialog";
import {
  GetInProgressTablesResponse,
  GetOpenTablesResponse,
  TableStatus,
} from "@/app/features/roulette/v1/queries/roulette.types";
import { CardTemplate } from "@/app/features/root/v1/components/CardTemplate";
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

  const gridContent = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {activeTables.map((table) => {
        const isPlayerInTable = table.players.some(
          (p) => p.user.id.toLowerCase() === address?.toLowerCase()
        );
        const createdAt = formatRelativeTimeFromSeconds(t, table.createdAt);
        const isOpen = selectedList === "open";

        let statusLabel: string;
        let statusVariant: "default" | "secondary" | "destructive" = "secondary";
        if (isOpen) {
          statusLabel = t("table_status_open");
        } else if (table.status === TableStatus.InProgress) {
          statusLabel = t("table_status_in_progress");
          statusVariant = "default";
        } else if (table.status === TableStatus.WaitingRandom) {
          statusLabel = t("table_status_waiting_rng");
          statusVariant = "destructive";
        } else {
          statusLabel = table.status;
        }

        // Open tables: show initial bet + max increment. Playing tables: show pot + initial bet.
        const leftIcon = isOpen
          ? <DollarSign className="h-3.5 w-3.5 text-primary shrink-0" />
          : <DollarSign className="h-3.5 w-3.5 text-green-500 shrink-0" />;
        const leftLabel = isOpen ? t("table_field_initial_bet") : t("tables_pot_label");
        const leftValue = isOpen
          ? `$${weiToUsdc(table.initialBetAmount)}`
          : <span className="text-green-500">${weiToUsdc(table.totalPool)}</span>;

        const rightLabel = isOpen ? t("table_field_max_incr") : t("table_field_initial_bet");
        const rightValue = isOpen
          ? `$${weiToUsdc(table.maxIncrement)}`
          : `$${weiToUsdc(table.initialBetAmount)}`;

        return (
          <Card
            key={table.id}
            role="button"
            tabIndex={0}
            className={cn(
              "relative cursor-pointer transition-all duration-200 group",
              selectedTableId === table.id
                ? "ring-2 ring-primary shadow-[0_0_20px_hsl(23_100%_50%/0.15)]"
                : "hover:shadow-[0_0_16px_hsl(23_100%_50%/0.1)] hover:border-primary/40",
              isOpen && isPlayerInTable && "border-primary/50",
              !isOpen && table.status === TableStatus.InProgress && "border-green-500/30",
              !isOpen && table.status === TableStatus.WaitingRandom && "border-yellow-500/30"
            )}
            onClick={() => handleTableClick(table.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleTableClick(table.id);
              }
            }}
          >
            <CardContent className="p-4 sm:pt-5">
              {/* Header row */}
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-base sm:text-lg group-hover:text-primary transition-colors">
                  {t("table_label")} #{table.id}
                </h3>
                <Badge variant={statusVariant} className={cn(
                  "text-[10px] sm:text-xs",
                  !isOpen && table.status === TableStatus.WaitingRandom && "animate-pulse"
                )}>
                  {statusLabel}
                </Badge>
              </div>

              {/* Bet info */}
              <div className="flex items-center gap-3 mb-3 p-2 rounded-md bg-muted/30 border border-border/40">
                <div className="flex items-center gap-1.5 flex-1">
                  {leftIcon}
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">{leftLabel}</p>
                    <p className="text-sm font-bold">{leftValue}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-1">
                  <TrendingUp className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">{rightLabel}</p>
                    <p className="text-sm font-bold">{rightValue}</p>
                  </div>
                </div>
              </div>

              {/* Players + meta */}
              <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
                <span>{table.players.length}/{table.maxPlayers} {t("game_header_players").toLowerCase()}</span>
                {isOpen && (() => {
                  const readyCount = table.players.filter((p) => "isReady" in p && p.isReady).length;
                  return <span>{t("table_field_ready")} {readyCount}/{table.players.length}</span>;
                })()}
                <span title={createdAt.full}>{createdAt.label}</span>
              </div>

              {isPlayerInTable && (
                <div className="mt-2.5 pt-2.5 border-t border-border/40">
                  <Badge variant="default" className="text-[10px] sm:text-xs w-full justify-center">
                    {t("table_badge_youre_in")}
                  </Badge>
                </div>
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
        <div className="text-center py-12 border border-dashed border-border/60 rounded-lg">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <p className="text-muted-foreground mb-4">{emptyMessage}</p>
          {selectedList === "open" && (
            <Button
              size="lg"
              onClick={() => setIsCreateDialogOpen(true)}
              className="shadow-[0_0_20px_hsl(23_100%_50%/0.2)]"
            >
              <Plus className="h-4 w-4 mr-2" />
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
              className="self-stretch sm:self-auto shadow-[0_0_16px_hsl(23_100%_50%/0.2)] hover:shadow-[0_0_24px_hsl(23_100%_50%/0.3)]"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
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
