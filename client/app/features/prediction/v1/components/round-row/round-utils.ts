import type { useTranslations } from "next-intl";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export const getStatusLabel = (
  t: ReturnType<typeof useTranslations>,
  status: string
) => {
  switch (status) {
    case "OPEN":
      return t("rounds.status.open");
    case "LIVE":
      return t("rounds.status.live");
    case "CLOSED":
      return t("rounds.status.closed");
    case "CANCELLED":
      return t("rounds.status.cancelled");
    default:
      return status;
  }
};

export const getPositionLabel = (
  t: ReturnType<typeof useTranslations>,
  position: string | undefined
) => {
  switch (position) {
    case "UP":
      return t("rounds.positions.up");
    case "DOWN":
      return t("rounds.positions.down");
    case "EQUAL":
      return t("rounds.positions.equal");
    case "PENDING":
      return t("rounds.positions.pending");
    default:
      return position ?? "";
  }
};

export const getPositionVariant = (
  position: string | undefined
): BadgeVariant => {
  switch (position) {
    case "UP":
      return "default";
    case "DOWN":
      return "destructive";
    case "EQUAL":
      return "secondary";
    default:
      return "secondary";
  }
};

export const formatPercentage = (percent: string) => {
  return Number.parseFloat(percent).toFixed(2);
};

export const getCurrentTrend = (
  lockPrice: bigint,
  closePrice: bigint | undefined
) => {
  if (!closePrice || closePrice === BigInt(0)) {
    return { direction: "PENDING" as const };
  }

  const lock = Number(lockPrice);
  const current = Number(closePrice);

  if (current > lock) return { direction: "UP" as const };
  if (current < lock) return { direction: "DOWN" as const };
  return { direction: "EQUAL" as const };
};
