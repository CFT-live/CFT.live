/** Maximum round duration in minutes (1 week). Not currently exposed by the contract. */
export const ROUND_MAX_DURATION_MINUTES = 60 * 24 * 7;

interface ValidateRoundFormParams {
  lockInMinutes: string;
  closeInMinutes: string;
  amount: string;
  minOpenTime: number;
  minLockTime: number;
  minBetAmount: number;
  maxBetAmount: number;
}

/**
 * Validates round creation form values.
 * Returns an object with the i18n error key and interpolation params, or null if valid.
 */
export function validateRoundForm({
  lockInMinutes,
  closeInMinutes,
  amount,
  minOpenTime,
  minLockTime,
  minBetAmount,
  maxBetAmount,
}: ValidateRoundFormParams): { key: string; params?: Record<string, number> } | null {
  const lockMinutesNum = Number(lockInMinutes);
  const closeMinutesNum = Number(closeInMinutes);

  if (!Number.isFinite(lockMinutesNum) || !Number.isFinite(closeMinutesNum)) {
    return { key: "create_round.errors.lock_close_minutes_valid_numbers" };
  }
  if (lockMinutesNum <= 0 || closeMinutesNum <= 0) {
    return { key: "create_round.errors.minutes_greater_than_zero" };
  }
  if (lockMinutesNum * 60 < minOpenTime) {
    return {
      key: "create_round.errors.open_minutes_at_least_seconds",
      params: { seconds: minOpenTime },
    };
  }
  if (closeMinutesNum * 60 < minLockTime) {
    return {
      key: "create_round.errors.lock_minutes_at_least_seconds",
      params: { seconds: minLockTime },
    };
  }
  if (lockMinutesNum > ROUND_MAX_DURATION_MINUTES) {
    return {
      key: "create_round.errors.lock_minutes_cannot_exceed",
      params: { minutes: ROUND_MAX_DURATION_MINUTES },
    };
  }
  if (closeMinutesNum > ROUND_MAX_DURATION_MINUTES) {
    return {
      key: "create_round.errors.close_minutes_cannot_exceed",
      params: { minutes: ROUND_MAX_DURATION_MINUTES },
    };
  }
  if (!amount) {
    return { key: "create_round.errors.amount_required" };
  }
  if (amount.includes(".")) {
    return { key: "create_round.errors.amount_must_be_integer" };
  }
  if (!/^\d+$/.test(amount)) {
    return { key: "create_round.errors.amount_invalid" };
  }

  const amountNum = Number(amount);
  if (amountNum < minBetAmount) {
    return {
      key: "create_round.errors.amount_below_min",
      params: { amount: minBetAmount },
    };
  }
  if (amountNum > maxBetAmount) {
    return {
      key: "create_round.errors.amount_above_max",
      params: { amount: maxBetAmount },
    };
  }

  return null;
}
