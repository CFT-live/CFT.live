"use client";

import React, { useState } from "react";
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
import { useContractMetadata } from "@/app/hooks/useContractMetadata";
import { useContractPriceFeeds } from "@/app/hooks/useContractPriceFeeds";

export const ContractMetadata: React.FC = () => {
  const t  = useTranslations("prediction");
  const [isOpen, setIsOpen] = useState(false);
  const { data: metadata, isLoading } = useContractMetadata();
  const { data: priceFeeds } = useContractPriceFeeds();

  const contractAddress =
    process.env.NEXT_PUBLIC_PREDICTION_MARKET_CONTRACT_ADDRESS;
  const arbiscanUrl = contractAddress
    ? `https://arbiscan.io/address/${contractAddress}`
    : "#";

  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t("metadata")}</CardTitle>
          <CardDescription>{t("loading")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!metadata) {
    return <div>{t("metadata_not_available")}</div>;
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{t("metadata")}</CardTitle>
        <CardDescription>
          {t("metadata_description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Key Fields - Always Visible */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-muted-foreground text-sm">
              {t("contract_metadata.contract_address")}
            </p>
            <a
              href={arbiscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm break-all text-primary hover:underline inline-flex items-center gap-1"
            >
              {contractAddress}
              <ExternalLink className="size-3" />
            </a>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">
              {t("contract_metadata.min_max_bet_amount_usdc")}
            </p>
            <p className="font-semibold">
              ${metadata.minBetAmount} / ${metadata.maxBetAmount}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">
              {t("contract_metadata.fee_bps_percentage")}
            </p>
            <p className="font-semibold">{metadata.feeBpsPercentage}%</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">
              {t("contract_metadata.status")}
            </p>
            <Badge variant={metadata.paused ? "destructive" : "secondary"}>
              {metadata.paused
                ? t("contract_metadata.status_paused")
                : t("contract_metadata.status_active")}
            </Badge>
          </div>
        </div>

        {/* Collapsible Additional Details */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
            >
              <span>
                {isOpen
                  ? t("contract_metadata.hide_additional_details")
                  : t("contract_metadata.show_additional_details")}
              </span>
              {isOpen ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <p className="text-muted-foreground text-sm">
                  {t("contract_metadata.owner_address")}
                </p>
                <p className="font-mono text-sm break-all">
                  {metadata.ownerAddress}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  {t("contract_metadata.payment_token_address")}
                </p>
                <p className="font-mono text-sm break-all">
                  {metadata.paymentTokenAddress}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  {t("contract_metadata.fee_collector_address")}
                </p>
                <p className="font-mono text-sm break-all">
                  {metadata.feeCollectorAddress}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  {t("contract_metadata.bet_lock_buffer_seconds")}
                </p>
                <p>{metadata.betLockBufferInSeconds}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  {t("contract_metadata.data_wait_window_seconds")}
                </p>
                <p>{metadata.dataWaitWindowInSeconds}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  {t("contract_metadata.max_open_rounds_per_user")}
                </p>
                <p>{metadata.maxOpenRoundsPerUser}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  {t("contract_metadata.min_open_time_seconds")}
                </p>
                <p>{metadata.minOpenTimeInSeconds}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  {t("contract_metadata.min_lock_time_seconds")}
                </p>
                <p>{metadata.minLockTimeInSeconds}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  {t("contract_metadata.advance_cooldown_seconds")}
                </p>
                <p>{metadata.advanceCooldownInSeconds}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  {t("contract_metadata.price_max_age_seconds")}
                </p>
                <p>{metadata.priceMaxAge}</p>
              </div>
            </div>

            {/* Price Feeds Section */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-semibold mb-1 pt-2">
                {t("contract_metadata.price_feed_oracles")}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t("contract_metadata.price_feed_oracles_description")}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {priceFeeds &&
                  Object.entries(priceFeeds).map(([asset, feed]) => (
                    <div key={asset}>
                      <p className="text-muted-foreground text-sm">{asset}</p>
                      <p className="font-mono text-sm break-all">{feed}</p>
                    </div>
                  ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
