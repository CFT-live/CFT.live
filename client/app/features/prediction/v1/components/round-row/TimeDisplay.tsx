"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { MILLIS } from "../../../../../helpers";
import { useNow } from "../../hooks/useNow";

interface TimeDisplayProps {
  readonly timestamp: string;
}

export default function TimeDisplay({ timestamp }: Readonly<TimeDisplayProps>) {
  const t = useTranslations("prediction");
  const now = useNow();

  const targetTime = Number.parseInt(timestamp) * MILLIS.inSecond;
  const isFuture = targetTime > now;

  const display = useMemo(() => {
    const diff = targetTime - now;

    if (diff <= 0) {
      return new Date(targetTime).toLocaleString();
    }

    const days = Math.floor(diff / MILLIS.inDay);
    const hours = Math.floor((diff % MILLIS.inDay) / MILLIS.inHour);
    const minutes = Math.floor((diff % MILLIS.inHour) / MILLIS.inMinute);
    const seconds = Math.floor((diff % MILLIS.inMinute) / MILLIS.inSecond);

    if (days > 0) {
      return `${days}${t("rounds.time.days_short")} ${hours}${t("rounds.time.hours_short")} ${minutes}${t("rounds.time.minutes_short")}`;
    }
    if (hours > 0) {
      return `${hours}${t("rounds.time.hours_short")} ${minutes}${t("rounds.time.minutes_short")} ${seconds}${t("rounds.time.seconds_short")}`;
    }
    if (minutes > 0) {
      return `${minutes}${t("rounds.time.minutes_short")} ${seconds}${t("rounds.time.seconds_short")}`;
    }
    return `${seconds}${t("rounds.time.seconds_short")}`;
  }, [now, targetTime, t]);

  return (
    <span
      aria-live="polite"
      className={`truncate text-right text-xs ${
        isFuture
          ? "font-mono font-medium text-primary"
          : "text-muted-foreground"
      }`}
    >
      {display}
    </span>
  );
}
