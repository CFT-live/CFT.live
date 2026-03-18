"use client";

import { useMemo, useState } from "react";
import { AlertTriangleIcon, ArrowRightLeftIcon, WalletIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { AddCftToWallet } from "@/app/features/root/v1/components/AddCftToWallet";
import { AutoClearingAlert } from "@/app/features/root/v1/components/AutoClearingAlert";
import { ContractButton } from "@/app/features/root/v1/components/ContractButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { useRedeemCft } from "../hooks/useRedeemCft";

function formatNumber(value: string, maxFractionDigits = 4) {
  const numericValue = Number.parseFloat(value);

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return numericValue.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });
}

const QUICK_SELECT_VALUES = [25, 50, 75, 100] as const;

export default function RedeemPanel() {
  const t = useTranslations("redeem");
  const homeT = useTranslations("home");
  const [amount, setAmount] = useState("");
  const redemption = useRedeemCft(amount);

  const effectiveRate = useMemo(() => {
    const cftAmount = Number.parseFloat(amount);
    const usdcAmount = Number.parseFloat(redemption.quotedUsdcFormatted);

    if (!Number.isFinite(cftAmount) || cftAmount <= 0 || !Number.isFinite(usdcAmount)) {
      return null;
    }

    return (usdcAmount / cftAmount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  }, [amount, redemption.quotedUsdcFormatted]);

  const handleQuickFill = (percentage: number) => {
    const maxAmount = Number.parseFloat(redemption.maxAmount);

    if (!Number.isFinite(maxAmount) || maxAmount <= 0) {
      return;
    }

    const nextAmount = ((maxAmount * percentage) / 100).toString();
    setAmount(nextAmount);
    redemption.clearMessages();
  };

  const handleSetMax = () => {
    setAmount(redemption.maxAmount);
    redemption.clearMessages();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-6xl px-4 py-10 md:py-16">
        <div className="mb-8 flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.22em] text-primary">
              <ArrowRightLeftIcon className="h-3.5 w-3.5" />
              <span>{t("eyebrow")}</span>
            </div>
            <div>
              <h1 className="font-mono text-3xl font-bold text-primary md:text-5xl">
                {t("title")}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                {t("intro")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_360px]">
          <Card className="border-border/60 bg-card/60 shadow-[0_0_40px_hsl(var(--primary)/0.05)]">
            <CardHeader className="space-y-3 border-b border-border/50">
              <CardTitle className="font-mono text-xl text-primary">
                {t("panel_title")}
              </CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                {t("panel_description")}
              </p>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {redemption.configError ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                  {redemption.configError}
                </div>
              ) : null}

              {redemption.statusMessage ? (
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-foreground">
                  {redemption.statusMessage}
                </div>
              ) : null}

              <AutoClearingAlert
                message={redemption.errorMessage}
                variant="destructive"
                onClear={redemption.clearMessages}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                  <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <WalletIcon className="h-4 w-4" />
                    {t("wallet_balance")}
                  </div>
                  <div className="font-mono text-3xl font-bold text-primary">
                    {formatNumber(redemption.balanceFormatted)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {redemption.tokenName ?? "CFT"}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="redeem-amount" className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {t("amount_label")}
                  </label>
                  <button
                    type="button"
                    onClick={handleSetMax}
                    className="font-mono text-xs uppercase tracking-[0.18em] text-primary transition-colors hover:text-primary/80"
                  >
                    {t("max_button")}
                  </button>
                </div>
                <div className="flex gap-3">
                  <Input
                    id="redeem-amount"
                    type="number"
                    min="0"
                    step="any"
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value);
                      redemption.clearMessages();
                    }}
                    placeholder={t("amount_placeholder")}
                    disabled={redemption.isAnyPending}
                    className="font-mono"
                  />
                  <Button variant="outline" onClick={handleSetMax} disabled={redemption.isAnyPending}>
                    {t("max_button")}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {QUICK_SELECT_VALUES.map((percentage) => (
                    <Button
                      key={percentage}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickFill(percentage)}
                      disabled={redemption.isAnyPending}
                    >
                      {percentage}%
                    </Button>
                  ))}
                </div>

                {redemption.exceedsBalance ? (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {t("amount_exceeds_balance")}
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <div className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {t("estimated_receive")}
                    </div>
                    <div className="mt-2 font-mono text-2xl font-bold text-primary">
                      {redemption.isQuoteLoading ? t("loading") : `$${formatNumber(redemption.quotedUsdcFormatted)}`}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {t("minimum_receive")}
                    </div>
                    <div className="mt-2 font-mono text-xl font-bold text-foreground">
                      ${formatNumber(redemption.minUsdcOutFormatted)}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {t("effective_rate")}
                    </div>
                    <div className="mt-2 font-mono text-xl font-bold text-foreground">
                      {effectiveRate ? `${effectiveRate} USDC` : "-"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-primary/20 bg-background/70 p-5">
                <div>
                  <div className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                    {t("permit_title")}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {t("permit_description")}
                  </p>
                </div>

                <ContractButton
                  onClick={() => void redemption.redeemWithPermit()}
                  disabled={!redemption.canSubmit || redemption.isAnyPending}
                  className="w-full font-mono"
                >
                  {redemption.isPermitPending ? t("permit_pending") : t("permit_action")}
                </ContractButton>
              </div>

              <div className="space-y-4 rounded-xl border border-dashed border-border/70 bg-background/60 p-5">
                <div>
                  <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {t("fallback_title")}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {t("fallback_description")}
                  </p>
                </div>

                {redemption.needsApproval ? (
                  <div className="rounded-lg border border-border bg-accent p-4 text-sm text-foreground">
                    <div className="flex items-start gap-3">
                      <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                      <div className="space-y-3">
                        <p>{t("allowance_warning")}</p>
                        <div className="flex flex-wrap gap-2">
                          <ContractButton
                            onClick={redemption.approveExact}
                            disabled={redemption.isAnyPending}
                            variant="outline"
                            size="sm"
                          >
                            {redemption.isApprovalPending ? t("approval_pending") : t("approve_exact")}
                          </ContractButton>
                          <ContractButton
                            onClick={redemption.approveUnlimited}
                            disabled={redemption.isAnyPending}
                            variant="outline"
                            size="sm"
                          >
                            {redemption.isApprovalPending ? t("approval_pending") : t("approve_unlimited")}
                          </ContractButton>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                    {t("allowance_ready")}
                  </div>
                )}

                <ContractButton
                  onClick={redemption.redeemWithApproval}
                  disabled={!redemption.canSubmit || redemption.needsApproval || redemption.isAnyPending}
                  className="w-full font-mono"
                  variant="secondary"
                >
                  {redemption.isRedeemPending ? t("fallback_pending") : t("fallback_action")}
                </ContractButton>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <AddCftToWallet
              compact
              copy={{
                title: t("wallet_asset_title"),
                description: t("wallet_asset_description"),
                actionLabel: homeT("Wallet_Add_CTA"),
                pendingLabel: homeT("Wallet_Add_Pending"),
                successLabel: homeT("Wallet_Add_Success"),
                unsupportedLabel: homeT("Wallet_Add_Unsupported"),
                rejectedLabel: homeT("Wallet_Add_Rejected"),
                switchNetworkLabel: homeT("Wallet_Switch_Network"),
                copyAddressLabel: homeT("Wallet_Copy_Address"),
                copiedLabel: homeT("Wallet_Copied"),
                viewContractLabel: homeT("Wallet_View_Contract"),
                configMissingLabel: homeT("Wallet_Config_Missing"),
                connectLabel: homeT("Connect_Wallet"),
              }}
            />

            <Card className="border-border/60 bg-card/50">
              <CardHeader>
                <CardTitle className="font-mono text-lg text-primary">
                  {t("summary_title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
                  <span className="text-muted-foreground">{t("summary_amount")}</span>
                  <span className="font-mono text-foreground">{amount || "0"} CFT</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
                  <span className="text-muted-foreground">{t("summary_estimate")}</span>
                  <span className="font-mono text-foreground">${formatNumber(redemption.quotedUsdcFormatted)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
                  <span className="text-muted-foreground">{t("summary_minimum")}</span>
                  <span className="font-mono text-foreground">${formatNumber(redemption.minUsdcOutFormatted)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="space-y-3 p-5 text-sm leading-6 text-muted-foreground">
                <div className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                  {t("how_it_works_title")}
                </div>
                <p>{t("how_it_works_line_1")}</p>
                <p>{t("how_it_works_line_2")}</p>
                <p>{t("how_it_works_line_3")}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}