"use client";

import { TrendingUpIcon } from "lucide-react";
import {
  erc20Abi,
  formatUnits,
  isAddress,
  parseUnits,
  zeroAddress,
} from "viem";
import { useReadContract } from "wagmi";

import {
  CFT_REDEMPTION_POOL_ABI,
  CFT_REDEMPTION_POOL_ADDRESS,
} from "@/app/lib/contracts";

function formatPrice(value: string) {
  const amount = Number.parseFloat(value);

  if (!Number.isFinite(amount)) {
    return null;
  }

  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export function TokenPriceWidget() {
  const hasPoolAddress = isAddress(CFT_REDEMPTION_POOL_ADDRESS);
  const poolAddress = hasPoolAddress
    ? CFT_REDEMPTION_POOL_ADDRESS
    : zeroAddress;

  const cftRead = useReadContract({
    address: poolAddress,
    abi: CFT_REDEMPTION_POOL_ABI,
    functionName: "cft",
    query: {
      enabled: hasPoolAddress,
    },
  });

  const usdcRead = useReadContract({
    address: poolAddress,
    abi: CFT_REDEMPTION_POOL_ABI,
    functionName: "usdc",
    query: {
      enabled: hasPoolAddress,
    },
  });

  const cftAddress = cftRead.data;
  const usdcAddress = usdcRead.data;
  const hasCftAddress = cftAddress !== undefined && isAddress(cftAddress);
  const hasUsdcAddress = usdcAddress !== undefined && isAddress(usdcAddress);

  const cftDecimalsRead = useReadContract({
    address: hasCftAddress ? cftAddress : zeroAddress,
    abi: erc20Abi,
    functionName: "decimals",
    query: {
      enabled: hasCftAddress,
    },
  });

  const usdcDecimalsRead = useReadContract({
    address: hasUsdcAddress ? usdcAddress : zeroAddress,
    abi: erc20Abi,
    functionName: "decimals",
    query: {
      enabled: hasUsdcAddress,
    },
  });

  const cftDecimals = cftDecimalsRead.data;
  const usdcDecimals = usdcDecimalsRead.data;
  const quoteArgs: readonly [bigint] =
    cftDecimals === undefined
      ? [BigInt(0)]
      : [parseUnits("1", cftDecimals)];

  const quoteRead = useReadContract({
    address: poolAddress,
    abi: CFT_REDEMPTION_POOL_ABI,
    functionName: "quote",
    args: quoteArgs,
    query: {
      enabled: hasPoolAddress && cftDecimals !== undefined,
      refetchInterval: 30000,
    },
  });

  const quotedUsdc = quoteRead.data;

  const formattedQuote =
    quotedUsdc !== undefined && usdcDecimals !== undefined
      ? formatPrice(formatUnits(quotedUsdc, usdcDecimals))
      : null;

  const hasPrice = formattedQuote !== null;
  const hasReadError =
    cftRead.isError ||
    usdcRead.isError ||
    cftDecimalsRead.isError ||
    usdcDecimalsRead.isError ||
    quoteRead.isError;
  let priceText = "Loading...";
  let ratioText = "Fetching live redemption quote";
  let trendColor = "text-muted-foreground";

  if (!hasPoolAddress) {
    priceText = "Config missing";
    ratioText = "Set NEXT_PUBLIC_CFT_REDEMPTION_POOL_CONTRACT_ADDRESS";
    trendColor = "text-amber-500";
  } else if (hasReadError) {
    priceText = "Unavailable";
    ratioText = "Live quote unavailable";
    trendColor = "text-amber-500";
  }

  if (hasPrice) {
    priceText = `$${formattedQuote}`;
    ratioText = `1 CFT = ${formattedQuote} USDC`;
    trendColor = "text-green-500";
  }

  return (
    <div className="mb-10 flex justify-center lg:justify-start">
      <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-lg border border-primary/40 bg-card/70 px-5 py-3 backdrop-blur-sm sm:flex-nowrap">
        <span className="font-mono text-sm text-muted-foreground">
          CFT / USDC
        </span>
        <div className="hidden h-5 w-px bg-border/50 sm:block" />
        <div className="flex items-center gap-2">
          <span className="font-mono text-2xl font-bold text-primary text-glow-orange">
            {priceText}
          </span>
          <TrendingUpIcon
            className={[
              "h-4 w-4",
              trendColor,
            ].join(" ")}
          />
        </div>
        <div className="hidden h-5 w-px bg-border/50 sm:block" />
        <span className="font-mono text-xs text-muted-foreground">
          {ratioText}
        </span>
      </div>
    </div>
  );
}