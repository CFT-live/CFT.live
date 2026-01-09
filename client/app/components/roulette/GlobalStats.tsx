"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { request } from "graphql-request";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROULETTE_GLOBAL_STATS_QUERY_KEY } from "@/app/queries/keys";
import { getGlobalStatsQuery } from "@/app/queries/roulette";
import { DEFAULT_HEADERS } from "@/app/queries/headers";
import { REFRESH_INTERVAL_MILLIS, weiToUsdc } from "@/app/helpers";
import { Users, Trophy, DollarSign, TableIcon } from "lucide-react";

export const GlobalStats: React.FC = () => {
  const t = useTranslations("roulette");

  const { data, isLoading } = useQuery({
    queryKey: [ROULETTE_GLOBAL_STATS_QUERY_KEY],
    queryFn: async () => {
      return await request(
        process.env.NEXT_PUBLIC_ROULETTE_THE_GRAPH_API_URL!,
        getGlobalStatsQuery,
        {},
        DEFAULT_HEADERS
      );
    },
    staleTime: REFRESH_INTERVAL_MILLIS.medium,
    refetchInterval: REFRESH_INTERVAL_MILLIS.medium,
  });

  if (isLoading || !data?.globalStats) {
    return null;
  }

  const stats = data.globalStats;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("global_stats_total_users")}
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("global_stats_total_tables")}
          </CardTitle>
          <TableIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalTables}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {t("global_stats_tables_breakdown", {
              open: stats.openTables,
              active: stats.inProgressTables,
            })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("global_stats_total_volume")}
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${weiToUsdc(stats.totalVolume).toLocaleString()}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("global_stats_total_winnings")}
          </CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${weiToUsdc(stats.totalWinnings).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
