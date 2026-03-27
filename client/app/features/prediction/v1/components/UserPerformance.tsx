"use client";

import { useTranslations } from "next-intl";
import { request } from "graphql-request";
import { getUserPerformanceQuery } from "../queries/predictionMarket";
import { DEFAULT_HEADERS } from "../../../../queries/headers";
import { USER_PERFORMANCE_QUERY_KEY } from "../queries/keys";
import { useQuery } from "../hooks/useQuery";
import { REFRESH_INTERVAL_MILLIS, weiToUsdcString } from "../../../../helpers";
import { useAppKitAccount } from "@reown/appkit/react";

interface UserPerformance {
  id: string;
  totalBets: string;
  totalAmount: string;
  profitLoss: string;
  winRate: string;
  wonBets: string;
  lostBets: string;
}

interface UserPerformanceData {
  user: UserPerformance | null;
}

const formatPL = (pl: string) => {
  const n = Number(pl) / 1e6;
  const sign = n >= 0 ? "+" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
};

const getPLColor = (pl: string) => {
  const n = Number(pl);
  if (n > 0) return "text-primary";
  if (n < 0) return "text-destructive";
  return "text-muted-foreground";
};

const getLoadingFallback = (isLoading: boolean, fallback: string) =>
  isLoading ? "…" : fallback;

export const UserPerformance = () => {
  const t = useTranslations("prediction");
  const { address, isConnected } = useAppKitAccount();

  const { data, isLoading } = useQuery<UserPerformanceData>({
    queryKey: [USER_PERFORMANCE_QUERY_KEY, address],
    async queryFn(): Promise<UserPerformanceData> {
      if (!address) return { user: null };
      const result = await request(
        process.env.NEXT_PUBLIC_THE_GRAPH_API_URL as string,
        getUserPerformanceQuery,
        { user: address.toLowerCase() },
        DEFAULT_HEADERS
      );
      return result as UserPerformanceData;
    },
    enabled: isConnected && !!address,
    staleTime: REFRESH_INTERVAL_MILLIS.medium,
    refetchInterval: REFRESH_INTERVAL_MILLIS.medium,
  });

  if (!isConnected) {
    return (
      <div className="bg-card border border-border rounded px-4 py-3">
        <p className="text-xs text-muted-foreground text-center">
          {t("user_performance.connect_prompt")}
        </p>
      </div>
    );
  }

  const user = data?.user;
  const plColor = user ? getPLColor(user.profitLoss) : "text-muted-foreground";
  const winRateColor =
    user && Number(user.winRate) >= 50 ? "text-primary" : "text-destructive";

  const totalBetsValue = user
    ? Number(user.totalBets).toLocaleString()
    : getLoadingFallback(isLoading, "0");
  const winRateValue = user
    ? `${Number(user.winRate).toFixed(0)}%`
    : getLoadingFallback(isLoading, "—");
  const plValue = user
    ? formatPL(user.profitLoss)
    : getLoadingFallback(isLoading, "—");
  const volumeValue = user
    ? `$${weiToUsdcString(BigInt(user.totalAmount))}`
    : getLoadingFallback(isLoading, "—");

  const stats = [
    { label: t("user_performance.total_bets"), value: totalBetsValue, color: "text-foreground" },
    { label: t("user_performance.win_rate"), value: winRateValue, color: winRateColor },
    { label: t("user_performance.profit_loss"), value: plValue, color: plColor },
    { label: t("user_performance.total_volume"), value: volumeValue, color: "text-foreground" },
  ];

  return (
    <div className="bg-card border border-border rounded px-3 py-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
        {t("user_performance.title")}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </div>
            <div className={`text-sm font-bold font-mono ${stat.color}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
