"use client";

import { useTranslations } from "next-intl";
import { request } from "graphql-request";
import { getRecentActivityQuery } from "../queries/predictionMarket";
import { DEFAULT_HEADERS } from "../../../../queries/headers";
import { RECENT_ACTIVITY_QUERY_KEY } from "../queries/keys";
import { useQuery } from "../hooks/useQuery";
import { REFRESH_INTERVAL_MILLIS, weiToUsdcString } from "../../../../helpers";
import { CardTemplate } from "../../../root/v1/components/CardTemplate";

interface ActivityBet {
  id: string;
  amount: string;
  position: string;
  createdAt: string;
  round: { id: string; asset: string; status: string };
}

interface RecentActivityData {
  bets: ActivityBet[];
}

const formatTimeAgo = (timestamp: string, t: ReturnType<typeof useTranslations>) => {
  const diffMs = Date.now() - Number(timestamp) * 1000;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return t("recent_activity.just_now");
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60)
    return t("recent_activity.ago", {
      time: `${diffMin}${t("rounds.time.minutes_short")}`,
    });
  const diffHr = Math.floor(diffMin / 60);
  return t("recent_activity.ago", {
    time: `${diffHr}${t("rounds.time.hours_short")}`,
  });
};

export const RecentActivity = () => {
  const t = useTranslations("prediction");

  const { data, isLoading, refetch } = useQuery<RecentActivityData>({
    queryKey: [RECENT_ACTIVITY_QUERY_KEY],
    async queryFn(): Promise<RecentActivityData> {
      const result = await request(
        process.env.NEXT_PUBLIC_THE_GRAPH_API_URL as string,
        getRecentActivityQuery,
        { first: 20 },
        DEFAULT_HEADERS
      );
      return result as RecentActivityData;
    },
    staleTime: REFRESH_INTERVAL_MILLIS.short,
    refetchInterval: REFRESH_INTERVAL_MILLIS.short,
  });

  const bets = data?.bets ?? [];

  return (
    <CardTemplate
      title={t("recent_activity.title")}
      description=""
      isRefreshing={isLoading}
      refresh={refetch}
    >
      {bets.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t("recent_activity.no_activity")}
        </p>
      )}

      {bets.length > 0 && (
        <div className="space-y-0.5 max-h-60 overflow-y-auto">
          {bets.map((bet) => {
            const isUp = bet.position === "UP";
            return (
              <div
                key={bet.id}
                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-accent/20 transition-colors text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`font-bold shrink-0 ${isUp ? "text-primary" : "text-destructive"}`}
                  >
                    {isUp ? "↑" : "↓"}
                  </span>
                  <span className="font-mono font-medium shrink-0">
                    #{bet.round.id}
                  </span>
                  <span className="font-bold text-foreground shrink-0">
                    {bet.round.asset}
                  </span>
                  <span className="text-muted-foreground shrink-0">—</span>
                  <span className="shrink-0">
                    {weiToUsdcString(BigInt(bet.amount))} USDC
                  </span>
                  <span className="text-muted-foreground shrink-0">—</span>
                  <span
                    className={`font-bold shrink-0 ${isUp ? "text-primary" : "text-destructive"}`}
                  >
                    {isUp ? "UP" : "DOWN"}
                  </span>
                </div>
                <span className="text-muted-foreground shrink-0 font-mono">
                  {formatTimeAgo(bet.createdAt, t)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </CardTemplate>
  );
};
