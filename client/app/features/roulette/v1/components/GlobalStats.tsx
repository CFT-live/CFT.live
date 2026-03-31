"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { request } from "graphql-request";
import { motion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { ROULETTE_GLOBAL_STATS_QUERY_KEY } from "../queries/keys";
import { getGlobalStatsQuery } from "@/app/features/roulette/v1/queries/roulette";
import { DEFAULT_HEADERS } from "@/app/queries/headers";
import { REFRESH_INTERVAL_MILLIS, weiToUsdc } from "@/app/helpers";

export const GlobalStats: React.FC = () => {
  const t = useTranslations("roulette");

  const { data, isLoading } = useQuery({
    queryKey: [ROULETTE_GLOBAL_STATS_QUERY_KEY],
    queryFn: async () => {
      return await request(
        process.env.NEXT_PUBLIC_ROULETTE_THE_GRAPH_API_URL!,
        getGlobalStatsQuery,
        {},
        DEFAULT_HEADERS,
      );
    },
    staleTime: REFRESH_INTERVAL_MILLIS.medium,
    refetchInterval: REFRESH_INTERVAL_MILLIS.medium,
  });

  if (isLoading || !data?.globalStats) {
    return null;
  }

  const stats = data.globalStats;

  const items = [
    {
      label: t("global_stats_total_tables"),
      value: Number(stats.totalTables),
      prefix: "",
    },
    {
      label: t("global_stats_total_volume"),
      value: weiToUsdc(stats.totalVolume),
      prefix: "$",
    },
    {
      label: t("global_stats_total_winnings"),
      value: weiToUsdc(stats.totalWinnings),
      prefix: "$",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="grid grid-cols-3 gap-px border border-border/60 rounded-sm overflow-hidden mb-6 sm:mb-8"
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
              format={
                item.prefix === "$"
                  ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                  : { maximumFractionDigits: 0 }
              }
            />
          </p>
        </div>
      ))}
    </motion.div>
  );
};
