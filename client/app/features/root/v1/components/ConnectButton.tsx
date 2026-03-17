"use client";

import { useTranslations } from "next-intl";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useReadContracts } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import { USDC_ADDRESS } from "@/app/lib/contracts";

export default function ConnectButton() {
  const t = useTranslations("home");
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();

  const { data } = useReadContracts({
    contracts: [
      {
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: address ? [address as `0x${string}`] : undefined,
      },
      {
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "decimals",
      },
    ],
    query: {
      enabled: !!address && isConnected,
    },
  });

  const balance = data?.[0]?.result;
  const decimals = data?.[1]?.result;
  const formattedBalance =
    balance !== undefined && decimals !== undefined
      ? formatUnits(balance, decimals)
      : "0";

  const handleClick = () => {
    open();
  };

  if (!isConnected) {
    return (
      <button
        onClick={handleClick}
        className="px-4 py-2 bg-primary text-primary-foreground rounded font-mono text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        {t("Connect_Wallet")}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 px-3 py-2 border border-border/50 rounded font-mono text-sm hover:border-primary/50 transition-colors"
    >
      <span className="text-muted-foreground">USDC:</span>
      <span className="text-foreground font-medium">
        {Number.parseFloat(formattedBalance).toFixed(2)}
      </span>
      <span className="text-muted-foreground">•</span>
      <span className="text-primary font-medium">
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </span>
    </button>
  );
}
