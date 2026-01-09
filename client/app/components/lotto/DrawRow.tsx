"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useEffect } from "react";
import { weiToUsdcString, MILLIS } from "../../helpers";
import { ContractButton } from "../ContractButton";
import { useTranslations } from "next-intl";
import { IMessage } from "@/global";

interface Draw {
  id: string;
  startTime: string;
  ticketPrice: string;
  potSize: string;
  ticketCount: string;
  open: boolean;
  winnerChosen: boolean;
  winner: string | null;
  claimed: boolean;
  closeTime: string | null;
  requestId: string | null;
}

interface DrawRowProps {
  draw: Draw;
  onBuyTickets?: (drawId: string) => void;
  onClaimWinnings?: (drawId: string) => void;
  onClaimRefund?: (drawId: string) => void;
  userAddress?: string;
  userTicketCount?: bigint;
}

export default function DrawRow({
  draw,
  onBuyTickets,
  onClaimWinnings,
  onClaimRefund,
  userAddress,
  userTicketCount,
}: Readonly<DrawRowProps>) {
  const t = useTranslations("lotto");
  const status = getStatus(draw);
  const isUserWinner =
    userAddress && draw.winner?.toLowerCase() === userAddress.toLowerCase();

  return (
    <Card className="shrink-0 w-[280px] sm:w-[320px] hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <div className="flex items-center justify-between">
          <Badge variant={getStatusVariant(status)}>{t(`status_${status.toLowerCase()}` as IMessage<"lotto">)}</Badge>
          <CardTitle className="text-base sm:text-lg font-mono">#{draw.id}</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6">
        {/* Pot and Tickets */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="space-y-0.5 sm:space-y-1">
            <div className="text-[10px] sm:text-xs text-muted-foreground">{t("draw_row_ticket_price")}</div>
            <div className="font-semibold text-base sm:text-lg">
              ${weiToUsdcString(draw.ticketPrice)}
            </div>
          </div>

          <div className="space-y-0.5 sm:space-y-1">
            <div className="text-[10px] sm:text-xs text-muted-foreground">{t("draw_row_prize_pool")}</div>
            <div className="font-semibold text-base sm:text-lg text-primary">
              ${weiToUsdcString(draw.potSize)}
            </div>
          </div>

          <div className="space-y-0.5 sm:space-y-1">
            <div className="text-[10px] sm:text-xs text-muted-foreground">{t("draw_row_total_tickets_sold")}</div>
            <div className="font-semibold text-base sm:text-lg">{draw.ticketCount}</div>
          </div>

          {userAddress && (
            <div className="space-y-0.5 sm:space-y-1">
              <div className="text-[10px] sm:text-xs text-muted-foreground">{t("draw_row_your_tickets")}</div>
              <div className="font-semibold text-base sm:text-lg text-primary">
                {userTicketCount?.toString() ?? "0"}
              </div>
            </div>
          )}
        </div>

        {/* Timing */}
        <div className="space-y-1.5 sm:space-y-2 pt-2 border-t">
          {draw.closeTime && (
            <div className="flex justify-between items-center">
              <span className="text-[10px] sm:text-xs text-muted-foreground">{t("draw_row_draw_time")}</span>
              <TimeDisplay timestamp={draw.closeTime} />
            </div>
          )}
        </div>

        {/* Winner Info */}
        {draw.winnerChosen && draw.winner && (
          <div className="space-y-1.5 sm:space-y-2 pt-2 border-t">
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">{t("draw_row_winner")}</div>
            <div className="font-mono text-[10px] sm:text-xs break-all bg-accent p-1.5 sm:p-2 rounded">
              {draw.winner}
            </div>
            {isUserWinner && (
              <Badge variant="default" className="w-full justify-center">
                {t("draw_row_you_won")}
              </Badge>
            )}
          </div>
        )}

        {/* Status-specific actions */}
        {status === "OPEN" && onBuyTickets && (
          <div className="pt-2">
            <ContractButton
              size="sm"
              variant="default"
              onClick={() => onBuyTickets(draw.id)}
              className="w-full"
            >
              {t("draw_row_buy_tickets")}
            </ContractButton>
          </div>
        )}

        {status === "CLOSED" && (
          <div className="pt-2">
            <Alert className="border-muted bg-accent">
              <AlertDescription className="text-xs text-center">
                {t("draw_row_waiting_vrf")}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {status === "WINNER_CHOSEN" && isUserWinner && onClaimWinnings && (
          <div className="pt-2">
            <ContractButton
              size="sm"
              variant="default"
              onClick={() => onClaimWinnings(draw.id)}
              className="w-full"
            >
              {t("draw_row_claim_winnings")}
            </ContractButton>
          </div>
        )}

        {status === "CLAIMED" && (
          <div className="pt-2">
            <Alert className="border-primary bg-accent">
              <AlertDescription className="text-xs text-center">
                {t("draw_row_prize_claimed")}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {status === "CANCELLED" && onClaimRefund && (
          <div className="pt-2">
            <ContractButton
              size="sm"
              variant="outline"
              onClick={() => onClaimRefund(draw.id)}
              className="w-full"
            >
              {t("draw_row_claim_refund")}
            </ContractButton>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const TimeDisplay = ({ timestamp }: { timestamp: string }) => {
  const t = useTranslations("lotto");
  const [display, setDisplay] = useState("");

  useEffect(() => {
    const updateDisplay = () => {
      const targetTime = Number.parseInt(timestamp) * MILLIS.inSecond;
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        // Time has passed, show timestamp
        setDisplay(new Date(targetTime).toLocaleString());
        return;
      }

      // Time is in future, show countdown
      const days = Math.floor(diff / (MILLIS.inSecond * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (MILLIS.inSecond * 60 * 60 * 24)) / (MILLIS.inSecond * 60 * 60)
      );
      const minutes = Math.floor(
        (diff % (MILLIS.inSecond * 60 * 60)) / (MILLIS.inSecond * 60)
      );
      const seconds = Math.floor(
        (diff % (MILLIS.inSecond * 60)) / MILLIS.inSecond
      );

      if (days > 0) {
        setDisplay(t("time_days_hours_minutes", { days, hours, minutes }));
      } else if (hours > 0) {
        setDisplay(t("time_hours_minutes_seconds", { hours, minutes, seconds }));
      } else if (minutes > 0) {
        setDisplay(t("time_minutes_seconds", { minutes, seconds }));
      } else {
        setDisplay(t("time_seconds", { seconds }));
      }
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, MILLIS.inSecond);

    return () => clearInterval(interval);
  }, [t, timestamp]);

  const targetTime = Number.parseInt(timestamp) * MILLIS.inSecond;
  const isFuture = targetTime > Date.now();

  return (
    <span
      className={`${
        isFuture
          ? "font-mono font-semibold text-primary"
          : "text-muted-foreground text-sm"
      }`}
    >
      {display}
    </span>
  );
};

const getStatusVariant = (
  status: string
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "OPEN":
      return "default";
    case "CLOSED":
      return "secondary";
    case "WINNER_CHOSEN":
      return "default";
    case "CLAIMED":
      return "outline";
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
};

const getStatus = (draw: Draw) => {
  if (draw.open) return "OPEN";
  if (!draw.winnerChosen && !draw.open) return "CLOSED";
  if (draw.winnerChosen && !draw.claimed) return "WINNER_CHOSEN";
  if (draw.claimed) return "CLAIMED";
  return "CANCELLED";
};
