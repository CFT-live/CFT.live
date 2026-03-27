import { formatUnits, parseUnits } from "viem";
import { Asset, Bet } from "./types";

export const MILLIS = {
  inSecond: 1000,
  inMinute: 60000,
  inHour: 3600000,
  inDay: 86400000,
};

// Enum mappings to match contract
export const ASSET_ENUM = {
  ETH: 0,
  ARB: 1,
  AAVE: 2,
  BTC: 3,
  SOL: 4,
  XRP: 5,
  BNB: 6,
  DOGE: 7,
  PEPE: 8,
  SHIB: 9,
} as const;

export const POSITION_ENUM = {
  UNSET: 0,
  UP: 1,
  DOWN: 2,
} as const;

export const usdcToWei = (usdcAmount: number | string): bigint => {
  if (typeof usdcAmount === "number") {
    return parseUnits(`${usdcAmount}`, 6);
  }
  return parseUnits(usdcAmount, 6);
};

export const weiToUsdc = (weiAmount: bigint | string): number => {
  const usdcString = (Number(weiAmount) / 1e6).toFixed(6);
  return Number(usdcString);
};

export const weiToUsdcString = (weiAmount: bigint | string): string => {
  return weiToUsdc(weiAmount).toFixed(2);
};

// Pyth oracle price feed decimals (absolute value of expo per asset)
export const PYTH_PRICE_DECIMALS: Record<string, number> = {
  ETH: 8,
  ARB: 8,
  AAVE: 8,
  BTC: 8,
  SOL: 8,
  XRP: 8,
  BNB: 8,
  DOGE: 8,
  PEPE: 10,
  SHIB: 10,
};

export const getPythDecimals = (asset: Asset): number =>
  PYTH_PRICE_DECIMALS[asset] ?? 8;

export const priceToString = (
  price: bigint | undefined,
  assetOrDecimals: Asset | number,
  outputDecimals?: number | undefined
): string => {
  if (!price) return "-";
  const decimals =
    typeof assetOrDecimals === "number" ? assetOrDecimals : getPythDecimals(assetOrDecimals);
  const formatted = formatUnits(price, decimals);
  if (outputDecimals !== undefined) {
    const num = Number.parseFloat(formatted);
    return num.toFixed(outputDecimals);
  }
  return formatted;
};

export const numberPriceToBigInt = (
  price: number | string,
  decimals: number = 8
): bigint => {
  return parseUnits(price.toString(), decimals);
};

export const isBetClaimable = (bet: Bet): boolean => {
  if (bet.claimed) return false;
  return isWinningBet(bet);
};

export const isWinningBet = (bet: Bet): boolean => {
    if (bet.round.status === "CANCELLED") return true;
  if (
    bet.round.status === "CLOSED" &&
    (bet.isWinner || bet.position === bet.round.finalPosition)
  ) {
    return true;
  }
  return false;
}

export const REFRESH_INTERVAL_MILLIS = {
  short: 15 * MILLIS.inSecond,
  medium: 1 * MILLIS.inMinute,
  long: 5 * MILLIS.inMinute,
};