"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useQuery } from "../../../prediction/v1/hooks/useQuery";
import { request } from "graphql-request";
import { DEFAULT_HEADERS } from "../../../../queries/headers";
import { getDrawsWithWinnerQuery } from "../queries/lotto";
import { LOTTO_WINNER_DRAWS_QUERY_KEY } from "../queries/keys";
import { REFRESH_INTERVAL_MILLIS, weiToUsdcString } from "../../../../helpers";
import { useAppKitAccount } from "@reown/appkit/react";

interface Draw {
  id: string;
  winner: string | null;
  potSize: string;
  ticketCount: string;
  closeTime: string | null;
  claimed: boolean;
}

interface WinnerDrawsData {
  draws: Draw[];
}

const RECENT_COUNT = 5;

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function RecentWinners() {
  const t = useTranslations("lotto");
  const { address: userAddress } = useAppKitAccount();

  const { data } = useQuery<WinnerDrawsData>({
    queryKey: [LOTTO_WINNER_DRAWS_QUERY_KEY],
    async queryFn(): Promise<WinnerDrawsData> {
      return await request(
        process.env.NEXT_PUBLIC_LOTTO_THE_GRAPH_API_URL ?? "",
        getDrawsWithWinnerQuery,
        { first: RECENT_COUNT, skip: 0 },
        DEFAULT_HEADERS
      ) as unknown as WinnerDrawsData;
    },
    staleTime: REFRESH_INTERVAL_MILLIS.medium,
    refetchInterval: REFRESH_INTERVAL_MILLIS.medium,
  });

  const draws = data?.draws ?? [];
  if (!draws.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="border border-border/60 rounded-sm bg-muted/10 mb-6 sm:mb-8 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 sm:px-6 border-b border-border/60">
        <Trophy className="w-4 h-4 text-primary" />
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider">
          {t("recent_winners_title")}
        </p>
      </div>

      {/* Winner rows */}
      <div className="divide-y divide-border/40">
        {draws.map((draw, i) => {
          const isCurrentUser =
            userAddress && draw.winner?.toLowerCase() === userAddress.toLowerCase();
          const closeDate = draw.closeTime
            ? new Date(Number(draw.closeTime) * 1000).toLocaleDateString()
            : "—";

          return (
            <motion.div
              key={draw.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              className={`flex items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm ${
                isCurrentUser ? "bg-primary/5 border-l-2 border-primary" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-muted-foreground w-6">#{draw.id}</span>
                <span className="font-mono text-foreground/80">
                  {draw.winner ? truncateAddress(draw.winner) : "—"}
                </span>
                {isCurrentUser && (
                  <span className="text-[10px] uppercase bg-primary/20 text-primary px-1.5 py-0.5 rounded-sm font-bold">
                    {t("draw_row_you_won")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-right">
                <span className="font-mono font-bold text-primary">${weiToUsdcString(draw.potSize)}</span>
                <span className="hidden sm:block text-muted-foreground text-[10px]">{closeDate}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
