"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { MILLIS } from "../../../../../helpers";

interface TimeDisplayProps {
  readonly timestamp: string;
}

export default function TimeDisplay({ timestamp }: Readonly<TimeDisplayProps>) {
  const t = useTranslations("prediction");
  const [display, setDisplay] = useState("");

  useEffect(() => {
    const updateDisplay = () => {
      const targetTime = Number.parseInt(timestamp) * MILLIS.inSecond;
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setDisplay(new Date(targetTime).toLocaleString());
        return;
      }

      const days = Math.floor(diff / MILLIS.inDay);
      const hours = Math.floor((diff % MILLIS.inDay) / MILLIS.inHour);
      const minutes = Math.floor((diff % MILLIS.inHour) / MILLIS.inMinute);
      const seconds = Math.floor((diff % MILLIS.inMinute) / MILLIS.inSecond);

      if (days > 0) {
        setDisplay(
          `${days}${t("rounds.time.days_short")} ${hours}${t("rounds.time.hours_short")} ${minutes}${t("rounds.time.minutes_short")}`
        );
      } else if (hours > 0) {
        setDisplay(
          `${hours}${t("rounds.time.hours_short")} ${minutes}${t("rounds.time.minutes_short")} ${seconds}${t("rounds.time.seconds_short")}`
        );
      } else if (minutes > 0) {
        setDisplay(
          `${minutes}${t("rounds.time.minutes_short")} ${seconds}${t("rounds.time.seconds_short")}`
        );
      } else {
        setDisplay(`${seconds}${t("rounds.time.seconds_short")}`);
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
