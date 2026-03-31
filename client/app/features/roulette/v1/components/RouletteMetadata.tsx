"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { useContractMetadata } from "../hooks/useContractMetadataRoulette";

const contractAddress = process.env.NEXT_PUBLIC_ROULETTE_CONTRACT_ADDRESS;
const arbiscanUrl = contractAddress
  ? `https://arbiscan.io/address/${contractAddress}`
  : "#";

export const ContractMetadata: React.FC = () => {
  const t = useTranslations("roulette");
  const { data: metadata, isLoading } = useContractMetadata();

  if (isLoading || !metadata) {
    return null;
  }

  return (
    <div className="border border-border/60 rounded-sm overflow-hidden">
      <div className="px-4 py-3 sm:py-4 bg-muted/20">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          {t("metadata_card_title")}
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm">
          <a
            href={arbiscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-primary hover:underline inline-flex items-center gap-1"
          >
            <span className="truncate max-w-[180px] sm:max-w-none">{contractAddress}</span>
            <ExternalLink className="size-3 shrink-0" />
          </a>
          <Badge variant={metadata.paused ? "destructive" : "secondary"} className="text-[10px]">
            {metadata.paused
              ? t("metadata_status_paused")
              : t("metadata_status_active")}
          </Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/30">
        <div className="bg-background px-4 py-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            {t("metadata_min_bet")}
          </p>
          <p className="font-mono font-bold text-sm sm:text-base">${metadata.minBetAmount}</p>
        </div>
        <div className="bg-background px-4 py-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            {t("metadata_max_bet")}
          </p>
          <p className="font-mono font-bold text-sm sm:text-base">${metadata.maxBetAmount}</p>
        </div>
        <div className="bg-background px-4 py-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            {t("metadata_fee")}
          </p>
          <p className="font-mono font-bold text-sm sm:text-base">{metadata.feeBps}%</p>
        </div>
        <div className="bg-background px-4 py-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            {t("metadata_next_table")}
          </p>
          <p className="font-mono font-bold text-sm sm:text-base">#{metadata.nextTableId}</p>
        </div>
      </div>
    </div>
  );
};
