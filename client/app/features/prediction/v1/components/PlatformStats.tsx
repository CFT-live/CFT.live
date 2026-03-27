"use client";

import { useTranslations } from "next-intl";
import { request } from "graphql-request";
import { getPlatformStatsQuery } from "../queries/predictionMarket";
import { DEFAULT_HEADERS } from "../../../../queries/headers";
import { PLATFORM_STATS_QUERY_KEY } from "../queries/keys";
import { useQuery } from "../hooks/useQuery";
import { REFRESH_INTERVAL_MILLIS, weiToUsdcString } from "../../../../helpers";
import { TrendingUp, Users, BarChart2, Zap, Circle } from "lucide-react";

interface GlobalStats {
  totalUsers: string;
  totalBets: string;
  totalVolume: string;
  totalRounds: string;
  openRounds: string;
  liveRounds: string;
}

interface PlatformStatsData {
  globalStats: GlobalStats | null;
}

export const PlatformStats = () => {
  const t = useTranslations("prediction");

  const { data, isLoading } = useQuery<PlatformStatsData>({
    queryKey: [PLATFORM_STATS_QUERY_KEY],
    async queryFn(): Promise<PlatformStatsData> {
      const result = await request(
        process.env.NEXT_PUBLIC_THE_GRAPH_API_URL as string,
        getPlatformStatsQuery,
        {},
        DEFAULT_HEADERS
      );
      return result as PlatformStatsData;
    },
    staleTime: REFRESH_INTERVAL_MILLIS.medium,
    refetchInterval: REFRESH_INTERVAL_MILLIS.medium,
  });

  const stats = data?.globalStats;

  const statItems = [
    {
      icon: TrendingUp,
      label: t("platform_stats.total_volume"),
      value: stats ? `$${weiToUsdcString(BigInt(stats.totalVolume))}` : "—",
      color: "text-primary",
    },
    {
      icon: BarChart2,
      label: t("platform_stats.total_rounds"),
      value: stats ? Number(stats.totalRounds).toLocaleString() : "—",
      color: "text-foreground",
    },
    {
      icon: Users,
      label: t("platform_stats.total_users"),
      value: stats ? Number(stats.totalUsers).toLocaleString() : "—",
      color: "text-foreground",
    },
    {
      icon: Zap,
      label: t("platform_stats.live_rounds"),
      value: stats ? stats.liveRounds : "—",
      color: "text-primary",
      pulse: true,
    },
    {
      icon: Circle,
      label: t("platform_stats.open_rounds"),
      value: stats ? stats.openRounds : "—",
      color: "text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-6">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="bg-card border border-border rounded px-3 py-2 flex items-center gap-2"
        >
          <item.icon
            className={`h-4 w-4 shrink-0 ${item.color} ${item.pulse ? "animate-pulse" : ""}`}
          />
          <div className="min-w-0">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
              {item.label}
            </div>
            <div
              className={`text-sm font-bold font-mono leading-tight truncate ${item.color} ${isLoading ? "opacity-50" : ""}`}
            >
              {item.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
