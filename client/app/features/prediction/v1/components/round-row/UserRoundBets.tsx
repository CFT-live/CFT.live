"use client";

import { useTranslations } from "next-intl";
import { request } from "graphql-request";
import { useAppKitAccount } from "@reown/appkit/react";
import { Badge } from "@/components/ui/badge";
import { REFRESH_INTERVAL_MILLIS, weiToUsdcString } from "../../../../../helpers";
import { getUserBetsForRoundQuery } from "../../queries/predictionMarket";
import { DEFAULT_HEADERS } from "@/app/queries/headers";
import { useQuery } from "../../hooks/useQuery";

interface Bet {
  id: string;
  amount: string;
  position: string;
  isWinner: boolean | null;
  isRefund: boolean | null;
  claimed: boolean;
}

interface UserBetsForRoundData {
  bets: Bet[];
}

interface UserRoundBetsProps {
  readonly roundId: string;
  readonly roundStatus: string;
}

export default function UserRoundBets({ roundId, roundStatus }: UserRoundBetsProps) {
  const t = useTranslations("prediction");
  const { address } = useAppKitAccount();
  const userAddress = address?.toLowerCase() ?? "";

  const { data } = useQuery<UserBetsForRoundData>({
    queryKey: ["userRoundBets", roundId, userAddress],
    async queryFn() {
      const res = await request(
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-non-null-assertion
        process.env.NEXT_PUBLIC_THE_GRAPH_API_URL!,
        getUserBetsForRoundQuery,
        {
          user: userAddress,
          roundId,
          userRoundId: `${userAddress}-${roundId}`,
        },
        DEFAULT_HEADERS,
      );
      return res as UserBetsForRoundData;
    },
    enabled: !!userAddress,
    staleTime: REFRESH_INTERVAL_MILLIS.medium,
    refetchInterval: REFRESH_INTERVAL_MILLIS.medium,
  });

  if (!userAddress || !data?.bets?.length) return null;

  return (
    <div className="border-t border-border/40 pt-2 mt-1">
      <div className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">
        {t("rounds.round_card.your_bets")}
      </div>
      <div className="space-y-1">
        {data.bets.map((bet) => (
          <div
            key={bet.id}
            className="flex items-center justify-between text-xs gap-2"
          >
            <div className="flex items-center gap-1.5">
              <span
                className={
                  bet.position === "UP" ? "text-primary" : "text-destructive"
                }
              >
                {bet.position === "UP" ? "↑" : "↓"}
              </span>
              <span className="font-mono">
                ${weiToUsdcString(bet.amount)}
              </span>
            </div>
            <BetStatusBadge bet={bet} roundStatus={roundStatus} t={t} />
          </div>
        ))}
      </div>
    </div>
  );
}

function BetStatusBadge({
  bet,
  roundStatus,
  t,
}: Readonly<{
  bet: Bet;
  roundStatus: string;
  t: ReturnType<typeof useTranslations>;
}>) {
  if (bet.isRefund) {
    return (
      <Badge variant="outline" className="text-[9px] px-1 py-0">
        {t("rounds.round_card.bet_refunded")}
      </Badge>
    );
  }
  // Open/Live rounds haven't resolved yet — always show Pending
  if (roundStatus === "OPEN" || roundStatus === "LIVE") {
    return (
      <Badge variant="secondary" className="text-[9px] px-1 py-0">
        {t("rounds.round_card.bet_pending")}
      </Badge>
    );
  }
  if (bet.isWinner === true) {
    return (
      <Badge className="text-[9px] px-1 py-0 bg-primary/20 text-primary border-primary/30">
        {t("rounds.round_card.bet_won")}
      </Badge>
    );
  }
  if (bet.isWinner === false) {
    return (
      <Badge variant="destructive" className="text-[9px] px-1 py-0">
        {t("rounds.round_card.bet_lost")}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[9px] px-1 py-0">
      {t("rounds.round_card.bet_pending")}
    </Badge>
  );
}
