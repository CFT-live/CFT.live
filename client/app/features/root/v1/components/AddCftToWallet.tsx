"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { arbitrum } from "@reown/appkit/networks";
import {
  CopyIcon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  WalletIcon,
} from "lucide-react";
import { erc20Abi, isAddress, zeroAddress } from "viem";
import { useChainId, useReadContracts, useSwitchChain, useWatchAsset } from "wagmi";

import { CFT_TOKEN_ADDRESS } from "@/app/lib/contracts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FALLBACK_SITE_ORIGIN = "https://www.cft.live";
const TOKEN_IMAGE_PATH = "/images/icon-192.png";
const DEFAULT_SYMBOL = "CFT";
const DEFAULT_DECIMALS = 18;

type NoticeTone = "default" | "success" | "warning";

type AddCftToWalletCopy = {
  title: string;
  description: string;
  actionLabel: string;
  pendingLabel: string;
  successLabel: string;
  unsupportedLabel: string;
  rejectedLabel: string;
  switchNetworkLabel: string;
  copyAddressLabel: string;
  copiedLabel: string;
  viewContractLabel: string;
  configMissingLabel: string;
  connectLabel: string;
};

type AddCftToWalletProps = {
  copy: AddCftToWalletCopy;
  className?: string;
  compact?: boolean;
};

function getTokenImageUrl() {
  if (typeof window === "undefined") {
    return new URL(TOKEN_IMAGE_PATH, FALLBACK_SITE_ORIGIN).toString();
  }

  return new URL(TOKEN_IMAGE_PATH, window.location.origin).toString();
}

function getNoticeFromError(error: unknown, copy: AddCftToWalletCopy) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (
    message.includes("user rejected") ||
    message.includes("user denied") ||
    message.includes("request rejected")
  ) {
    return { text: copy.rejectedLabel, tone: "default" as const };
  }

  if (
    message.includes("wallet_watchasset") ||
    message.includes("unsupported") ||
    message.includes("method not found") ||
    message.includes("does not support")
  ) {
    return { text: copy.unsupportedLabel, tone: "warning" as const };
  }

  return { text: copy.unsupportedLabel, tone: "warning" as const };
}

export function AddCftToWallet({ copy, className, compact = false }: Readonly<AddCftToWalletProps>) {
  const chainId = useChainId();
  const { isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const [notice, setNotice] = useState<{ text: string; tone: NoticeTone } | null>(null);
  const [copied, setCopied] = useState(false);
  const hasTokenAddress = isAddress(CFT_TOKEN_ADDRESS);
  const tokenAddress = hasTokenAddress ? CFT_TOKEN_ADDRESS : zeroAddress;
  const tokenImageUrl = useMemo(() => getTokenImageUrl(), []);
  const explorerUrl = hasTokenAddress
    ? `${arbitrum.blockExplorers.default.url}/token/${CFT_TOKEN_ADDRESS}`
    : arbitrum.blockExplorers.default.url;

  const { data } = useReadContracts({
    contracts: [
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "symbol",
      },
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "decimals",
      },
    ],
    query: {
      enabled: hasTokenAddress,
    },
  });

  const tokenSymbol = data?.[0]?.result ?? DEFAULT_SYMBOL;
  const tokenDecimals = data?.[1]?.result ?? DEFAULT_DECIMALS;
  const { mutateAsync: watchAssetAsync, isPending: isWatchAssetPending } = useWatchAsset();
  const { mutateAsync: switchChainAsync, isPending: isSwitchChainPending } = useSwitchChain();

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  const isWrongNetwork = isConnected && chainId !== arbitrum.id;
  const isBusy = isWatchAssetPending || isSwitchChainPending;
  const buttonLabel = !isConnected
    ? copy.connectLabel
    : isWrongNetwork
      ? copy.switchNetworkLabel
      : isBusy
        ? copy.pendingLabel
        : copy.actionLabel;

  const handleCopyAddress = async () => {
    if (!hasTokenAddress) {
      setNotice({ text: copy.configMissingLabel, tone: "warning" });
      return;
    }

    try {
      await navigator.clipboard.writeText(CFT_TOKEN_ADDRESS);
      setCopied(true);
    } catch {
      setNotice({ text: copy.unsupportedLabel, tone: "warning" });
    }
  };

  const handleAddToWallet = async () => {
    if (!hasTokenAddress) {
      setNotice({ text: copy.configMissingLabel, tone: "warning" });
      return;
    }

    if (!isConnected) {
      open();
      return;
    }

    setNotice(null);

    try {
      if (isWrongNetwork) {
        await switchChainAsync({ chainId: arbitrum.id });
      }

      const result = await watchAssetAsync({
        type: "ERC20",
        options: {
          address: CFT_TOKEN_ADDRESS,
          symbol: tokenSymbol,
          decimals: tokenDecimals,
          image: tokenImageUrl,
        },
      });

      setNotice({
        text: result ? copy.successLabel : copy.rejectedLabel,
        tone: result ? "success" : "default",
      });
    } catch (error) {
      setNotice(getNoticeFromError(error, copy));
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/20 bg-background/70 backdrop-blur-sm",
        compact ? "p-4" : "p-5",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
          <WalletIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              {copy.title}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {copy.description}
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-black/20 px-3 py-2 font-mono text-xs text-muted-foreground break-all">
            {hasTokenAddress ? CFT_TOKEN_ADDRESS : copy.configMissingLabel}
          </div>
            <Button
              type="button"
              onClick={() => void handleAddToWallet()}
              disabled={isBusy}
              className="font-mono"
            >
              {isBusy ? <LoaderCircleIcon className="h-4 w-4 animate-spin" /> : <WalletIcon className="h-4 w-4" />}
              {buttonLabel}
            </Button>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">


            <Button
              type="button"
              variant="outline"
              onClick={() => void handleCopyAddress()}
              disabled={!hasTokenAddress}
              className="font-mono"
            >
              <CopyIcon className="h-4 w-4" />
              {copied ? copy.copiedLabel : copy.copyAddressLabel}
            </Button>

            <Button asChild variant="outline" className="font-mono">
              <a href={explorerUrl} target="_blank" rel="noreferrer noopener">
                <ExternalLinkIcon className="h-4 w-4" />
                {copy.viewContractLabel}
              </a>
            </Button>
          </div>

          {notice ? (
            <div
              className={cn(
                "rounded-lg border px-3 py-2 text-sm",
                notice.tone === "success" && "border-primary/30 bg-primary/10 text-foreground",
                notice.tone === "warning" && "border-amber-500/30 bg-amber-500/10 text-amber-100",
                notice.tone === "default" && "border-border/60 bg-background/60 text-muted-foreground"
              )}
            >
              {notice.text}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}