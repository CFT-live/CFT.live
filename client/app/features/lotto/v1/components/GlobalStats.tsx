"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { useQuery } from "../../../prediction/v1/hooks/useQuery";
import { request } from "graphql-request";
import { DEFAULT_HEADERS } from "../../../../queries/headers";
import { getGlobalStatsQuery } from "../queries/lotto";
import { LOTTO_GLOBAL_STATS_QUERY_KEY } from "../queries/keys";
import { REFRESH_INTERVAL_MILLIS, weiToUsdc } from "../../../../helpers";

interface GlobalStatsData {
  globalStats: {
    totalUsers: string;
    totalDraws: string;
    totalTickets: string;
    totalVolume: string;
    totalWinnings: string;
  } | null;
}

export function GlobalStats() {
  const t = useTranslations("lotto");

  const { data } = useQuery<GlobalStatsData>({
    queryKey: [LOTTO_GLOBAL_STATS_QUERY_KEY],
    async queryFn(): Promise<GlobalStatsData> {
      return await request(
        process.env.NEXT_PUBLIC_LOTTO_THE_GRAPH_API_URL ?? "",
        getGlobalStatsQuery,
        {},
        DEFAULT_HEADERS
      ) as unknown as GlobalStatsData;
    },
    staleTime: REFRESH_INTERVAL_MILLIS.long,
    refetchInterval: REFRESH_INTERVAL_MILLIS.long,
  });

  const stats = data?.globalStats;
  if (!stats) return null;

  const items = [
    { label: t("global_stats_total_draws"), value: Number(stats.totalDraws), prefix: "" },
    { label: t("global_stats_total_volume"), value: weiToUsdc(stats.totalVolume), prefix: "$" },
    { label: t("global_stats_total_players"), value: Number(stats.totalUsers), prefix: "" },
    { label: t("global_stats_total_tickets"), value: Number(stats.totalTickets), prefix: "" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-px border border-border/60 rounded-sm overflow-hidden mb-6 sm:mb-8"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-muted/20 px-4 py-3 sm:py-4 text-center"
        >
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            {item.label}
          </p>
          <p className="font-mono font-bold text-base sm:text-xl text-foreground">
            {item.prefix}
            <NumberFlow
              value={item.value}
              format={item.prefix === "$" ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 }}
            />
          </p>
        </div>
      ))}
    </motion.div>
  );
}
