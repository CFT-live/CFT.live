"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useContractMetadata } from "../hooks/useContractMetadataRoulette";

const contractAddress = process.env.NEXT_PUBLIC_ROULETTE_CONTRACT_ADDRESS;
const arbiscanUrl = contractAddress
  ? `https://arbiscan.io/address/${contractAddress}`
  : "#";

export const ContractMetadata: React.FC = () => {
  const t = useTranslations("roulette");
  const [isOpen, setIsOpen] = useState(false);
  const { data: metadata, isLoading } = useContractMetadata();

  if (isLoading || !metadata) {
    return null;
  }

  return (
    <Card className="mb-6 sm:mb-8">
      <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
        <CardTitle className="text-base sm:text-lg">
          {t("metadata_card_title")}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {t("metadata_card_description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
        {/* Key Fields - Always Visible */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
          <div className="col-span-2 sm:col-span-1">
            <p className="text-muted-foreground text-xs sm:text-sm mb-1">
              {t("metadata_contract_address")}
            </p>
            <a
              href={arbiscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs sm:text-sm break-all text-primary hover:underline inline-flex items-center gap-1"
            >
              <span className="truncate max-w-[200px] sm:max-w-none">{contractAddress}</span>
              <ExternalLink className="size-3 shrink-0" />
            </a>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-muted-foreground text-xs sm:text-sm mb-1">
              {t("metadata_status")}
            </p>
            <Badge variant={metadata.paused ? "destructive" : "secondary"} className="text-xs">
              {metadata.paused
                ? t("metadata_status_paused")
                : t("metadata_status_active")}
            </Badge>
          </div>

          <div>
            <p className="text-muted-foreground text-xs sm:text-sm mb-1">
              {t("metadata_min_bet")}
            </p>
            <p className="font-semibold text-sm sm:text-base">${metadata.minBetAmount}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs sm:text-sm mb-1">
              {t("metadata_max_bet")}
            </p>
            <p className="font-semibold text-sm sm:text-base">${metadata.maxBetAmount}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs sm:text-sm mb-1">
              {t("metadata_fee")}
            </p>
            <p className="font-semibold text-sm sm:text-base">{metadata.feeBps}%</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs sm:text-sm mb-1">
              {t("metadata_next_table")}
            </p>
            <p className="font-semibold text-sm sm:text-base">#{metadata.nextTableId}</p>
          </div>
        </div>

        {/* Collapsible Additional Details */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-xs sm:text-sm h-8 sm:h-9"
            >
              <span>
                {isOpen ? t("metadata_hide_details") : t("metadata_more_details")}
              </span>
              {isOpen ? (
                <ChevronUp className="size-3.5 sm:size-4" />
              ) : (
                <ChevronDown className="size-3.5 sm:size-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 sm:mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  {t("metadata_callback_gas_limit")}
                </p>
                <p className="font-mono text-xs sm:text-sm break-all">
                  {metadata.callbackGasLimit}
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
