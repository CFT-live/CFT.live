"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { useQuery } from "../../../prediction/v1/hooks/useQuery";
import { request } from "graphql-request";
import { DEFAULT_HEADERS } from "../../../../queries/headers";
import { getUserStatsQuery } from "../queries/lotto";
import { LOTTO_USER_STATS_QUERY_KEY } from "../queries/keys";
import { REFRESH_INTERVAL_MILLIS, weiToUsdc } from "../../../../helpers";
import { useAppKitAccount } from "@reown/appkit/react";

interface UserStatsData {
  user: {
    totalTicketsBought: string;
    totalAmountSpent: string;
    totalWinnings: string;
    totalRefunds: string;
  } | null;
}

export function UserStats() {
  const t = useTranslations("lotto");
  const { address: userAddress } = useAppKitAccount();

  const { data } = useQuery<UserStatsData>({
    queryKey: [LOTTO_USER_STATS_QUERY_KEY, userAddress?.toLowerCase()],
    async queryFn(): Promise<UserStatsData> {
      return await request(
        process.env.NEXT_PUBLIC_LOTTO_THE_GRAPH_API_URL ?? "",
        getUserStatsQuery,
        { user: userAddress!.toLowerCase() },
        DEFAULT_HEADERS
      ) as unknown as UserStatsData;
    },
    enabled: Boolean(userAddress),
    staleTime: REFRESH_INTERVAL_MILLIS.medium,
  });

  if (!userAddress || !data?.user) return null;

  const user = data.user;
  const spent = weiToUsdc(user.totalAmountSpent);
  const winnings = weiToUsdc(user.totalWinnings);
  const netPnl = winnings - spent;
  const isProfitable = netPnl >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="border border-border/60 rounded-sm bg-muted/10 px-4 py-3 sm:px-6 sm:py-4 mb-6 sm:mb-8"
    >
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
        {t("user_stats_title")}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">{t("user_stats_tickets_bought")}</p>
          <p className="font-mono font-bold text-base sm:text-lg">
            <NumberFlow value={Number(user.totalTicketsBought)} />
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">{t("user_stats_total_spent")}</p>
          <p className="font-mono font-bold text-base sm:text-lg">
            $<NumberFlow value={spent} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">{t("user_stats_total_winnings")}</p>
          <p className="font-mono font-bold text-base sm:text-lg text-primary">
            $<NumberFlow value={winnings} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">{t("user_stats_net_pnl")}</p>
          <p className={`font-mono font-bold text-base sm:text-lg ${isProfitable ? "text-green-500" : "text-destructive"}`}>
            {isProfitable ? "+" : ""}$<NumberFlow value={Math.abs(netPnl)} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
          </p>
        </div>
      </div>
    </motion.div>
  );
}
