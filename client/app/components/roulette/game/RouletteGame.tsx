/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { request } from "graphql-request";
import { useAppKitAccount } from "@reown/appkit/react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ROULETTE_TABLE_DETAIL_QUERY_KEY } from "@/app/queries/keys";
import { getTableByIdQuery } from "@/app/queries/roulette";
import { DEFAULT_HEADERS } from "@/app/queries/headers";
import { REFRESH_INTERVAL_MILLIS } from "@/app/helpers";
import { AlertCircle } from "lucide-react";

// Import sub-components
import { GameHeader } from "./GameHeader";
import { PlayerList } from "./PlayerList";
import { GameControls } from "./GameControls";
import { TurnHistory } from "./TurnHistory";
import { GameVisuals } from "./GameVisuals";
import { TableActions } from "./TableActions";
import { Table } from "@/app/queries/roulette.types";
import { CardTemplate } from "../../CardTemplate";

interface RouletteGameProps {
  readonly tableId: string;
}

export const RouletteGame: React.FC<RouletteGameProps> = ({
  tableId,
}: Readonly<RouletteGameProps>) => {
  const t = useTranslations("roulette");
  const { address } = useAppKitAccount();

  // Fetch table data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [ROULETTE_TABLE_DETAIL_QUERY_KEY, tableId],
    queryFn: async () => {
      return await request(
        process.env.NEXT_PUBLIC_ROULETTE_THE_GRAPH_API_URL!,
        getTableByIdQuery,
        { tableId },
        DEFAULT_HEADERS
      );
    },
    staleTime: REFRESH_INTERVAL_MILLIS.short,
    refetchInterval: REFRESH_INTERVAL_MILLIS.short,
  });

  const table = data?.table as Table | null;

  // Compute user's participation status
  const userPlayer = useMemo(() => {
    if (!address || !table) return null;
    return table.players.find(
      (p: any) => p.user.id.toLowerCase() === address.toLowerCase()
    );
  }, [address, table]);

  const isParticipant = Boolean(userPlayer);
  const isCurrentPlayer = useMemo(() => {
    if (
      !table ||
      !address ||
      table.status !== "InProgress" ||
      table.currentPlayerIndex === undefined
    ) {
      return false;
    }
    const currentPlayer = table.players[table.currentPlayerIndex];
    return currentPlayer?.user.id.toLowerCase() === address.toLowerCase();
  }, [table, address]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              {t("game_loading_table")}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !table || table.playerCount === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("game_table_not_found")}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <CardTemplate
        title=""
        description=""
        isRefreshing={isLoading}
        refresh={refetch}
      >
        <div className="space-y-4 sm:space-y-6">
          <GameHeader table={table} />

          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* Main gameplay */}
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 lg:items-start">
                <GameControls
                  table={table}
                  isParticipant={isParticipant}
                  isCurrentPlayer={isCurrentPlayer}
                  userPlayer={userPlayer}
                />
                <div className="rounded-lg border border-zinc-700/50 bg-zinc-950/55 p-3 sm:p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                  <GameVisuals table={table} />
                </div>
              </div>

              <TurnHistory turns={table.turns ?? []} />
            </div>

            {/* Sidebar */}
            <div className="space-y-4 sm:space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-auto lg:pr-1">
              <TableActions table={table} />
              <PlayerList table={table} currentUserAddress={address} />
            </div>
          </div>
        </div>
      </CardTemplate>
    </div>
  );
};
