"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useCreateRound } from "../hooks/useCreateRound";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Clock,
  DollarSign,
  Loader2,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Asset, ASSETS, Position } from "../../../../types";
import { MILLIS } from "../../../../helpers";
import {
  CONTRACT_BALANCE_QUERY_KEY,
  OPEN_ROUNDS_QUERY_KEY,
} from "../queries/keys";
import { CardTemplate } from "../../../root/v1/components/CardTemplate";
import { TimePicker } from "./TimePicker";
import { ContractButton } from "../../../root/v1/components/ContractButton";
import { validateRoundForm } from "./validateRoundForm";

const PRESETS: { i18nKey: string; lock: string; close: string; asset: Asset; pos: Position }[] = [
  { i18nKey: "create_round.preset_5m_eth", lock: "5", close: "5", asset: "ETH", pos: "UP" },
  { i18nKey: "create_round.preset_15m_btc", lock: "5", close: "15", asset: "BTC", pos: "UP" },
  { i18nKey: "create_round.preset_1h_eth", lock: "5", close: "60", asset: "ETH", pos: "UP" },
  { i18nKey: "create_round.preset_1h_arb", lock: "5", close: "60", asset: "ARB", pos: "UP" },
];

/** Buffer (seconds) added to very short durations to avoid on-chain edge cases. */
const SHORT_DURATION_BUFFER_SECONDS = 30;

const SELECT_ITEM_CLASS =
  "focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground border-b border-border";

export const CreateRound = ({
  minOpenTime,
  minLockTime,
  minBetAmount,
  maxBetAmount,
}: {
  minOpenTime: number;
  minLockTime: number;
  minBetAmount: number;
  maxBetAmount: number;
}) => {
  const t = useTranslations("prediction");
  const queryClient = useQueryClient();

  const [lockInMinutes, setLockInMinutes] = useState<string>("5");
  const [closeInMinutes, setCloseInMinutes] = useState<string>("10");
  const [asset, setAsset] = useState<Asset>("ETH");
  const [position, setPosition] = useState<Position>("UP");
  const [amount, setAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const showTimeWarning =
    Number(lockInMinutes) < 5 || Number(closeInMinutes) < 5;

  const lockInDate = useMemo(
    () => new Date(Date.now() + Number(lockInMinutes) * MILLIS.inMinute),
    [lockInMinutes]
  );
  const closeInDate = useMemo(
    () =>
      new Date(
        Date.now() +
          Number(lockInMinutes) * MILLIS.inMinute +
          Number(closeInMinutes) * MILLIS.inMinute
      ),
    [lockInMinutes, closeInMinutes]
  );

  // Clear error when user changes any field value
  useEffect(() => {
    if (error) setError(null);
    if (success) setSuccess(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockInMinutes, closeInMinutes, asset, position, amount]);

  const onSuccess = useCallback(() => {
    setSuccess(t("create_round.success.round_created"));
    setAmount("");
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: [OPEN_ROUNDS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [CONTRACT_BALANCE_QUERY_KEY] });
    }, 3 * MILLIS.inSecond);
  }, [queryClient, t]);

  const { createRound, isLoading, errorMessage } = useCreateRound(onSuccess);

  useEffect(() => {
    if (errorMessage) setError(errorMessage);
  }, [errorMessage]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateRoundForm({
      lockInMinutes,
      closeInMinutes,
      amount,
      minOpenTime,
      minLockTime,
      minBetAmount,
      maxBetAmount,
    });
    if (validationError) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError(t(validationError.key as any, validationError.params as any));
      return;
    }

    const lockMinutesNum = Number(lockInMinutes);
    const closeMinutesNum = Number(closeInMinutes);
    const nowSeconds = Math.floor(Date.now() / MILLIS.inSecond);
    const lockAtSeconds =
      Math.floor(nowSeconds + lockMinutesNum * 60) +
      (lockMinutesNum === 1 ? SHORT_DURATION_BUFFER_SECONDS : 0);
    const closeAtSeconds =
      Math.floor(lockAtSeconds + closeMinutesNum * 60) +
      (closeMinutesNum === 1 ? 1 : 0);

    createRound(lockAtSeconds, closeAtSeconds, asset, position, amount);
  };

  return (
    <CardTemplate
      title={t("create_round.title")}
      description={t("create_round.description")}
      isRefreshing={false}
    >
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Quick Presets */}
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {t("create_round.presets_label")}
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.i18nKey}
                type="button"
                onClick={() => {
                  setLockInMinutes(preset.lock);
                  setCloseInMinutes(preset.close);
                  setAsset(preset.asset);
                  setPosition(preset.pos);
                }}
                className="text-xs px-3 py-1 rounded border border-border text-muted-foreground hover:border-primary/60 hover:text-foreground transition-colors font-mono"
              >
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {t(preset.i18nKey as any)}
              </button>
            ))}
          </div>
        </div>

        {/* Timing Section */}
        <div className="space-y-4 p-4 border border-border/50 rounded-md bg-card/30">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary font-semibold border-b border-border pb-2">
            <Clock className="w-4 h-4" />
            {t("create_round.steps.step_1")}
          </div>
          <div className="flex flex-col gap-6">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                <div className="flex flex-col gap-2 flex-1">
                  <Label
                    htmlFor="lock-minutes"
                    className="text-foreground font-semibold uppercase text-xs tracking-wider flex items-center gap-2"
                  >
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                      1
                    </span>
                    {t("create_round.timing.round_starts_in")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="lock-minutes"
                      type="number"
                      min={minOpenTime / 60}
                      step="1"
                      value={lockInMinutes}
                      onChange={(e) => setLockInMinutes(e.target.value)}
                      className="bg-input border min-w-64 border-yellow-500/60 focus:border-yellow-400 focus-visible:shadow-none h-11 pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      {t("create_round.units.minutes_abbrev")}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {t("create_round.timing.round_starts_in_help")}
                  </p>
                </div>
                <TimePicker
                  value={lockInDate}
                  onChange={(date) => {
                    const minutes = Math.ceil(
                      (date.getTime() - Date.now()) / MILLIS.inMinute
                    );
                    if (minutes > 0) setLockInMinutes(minutes.toString());
                  }}
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                <div className="flex flex-col gap-2 flex-1">
                  <Label
                    htmlFor="close-minutes"
                    className="text-foreground font-semibold uppercase text-xs tracking-wider flex items-center gap-2"
                  >
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                      2
                    </span>
                    {t("create_round.timing.round_duration")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="close-minutes"
                      type="number"
                      min={minLockTime / 60}
                      step="1"
                      value={closeInMinutes}
                      onChange={(e) => setCloseInMinutes(e.target.value)}
                      className="bg-input border min-w-64 border-yellow-500/60 focus:border-yellow-400 focus-visible:shadow-none h-11 pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      {t("create_round.units.minutes_abbrev")}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {t("create_round.timing.round_duration_help")}
                  </p>
                </div>
                <TimePicker
                  value={closeInDate}
                  onChange={(date) => {
                    const lockTimeMillis =
                      Date.now() + Number(lockInMinutes) * MILLIS.inMinute;
                    const minutes = Math.ceil(
                      (date.getTime() - lockTimeMillis) / MILLIS.inMinute
                    );
                    if (minutes > 0) setCloseInMinutes(minutes.toString());
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Market Selection Section */}
        <div className="space-y-4 p-4 border border-border/50 rounded-md bg-card/30">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary font-semibold border-b border-border pb-2">
            <TrendingUp className="w-4 h-4" />
            {t("create_round.steps.step_2")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label
                htmlFor="asset"
                className="text-foreground font-semibold uppercase text-xs tracking-wider flex items-center gap-2"
              >
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                  3
                </span>
                {t("create_round.market.select_asset")}
              </Label>
              <Select
                value={asset}
                onValueChange={(value) => setAsset(value as Asset)}
              >
                <SelectTrigger
                  id="asset"
                  className="bg-input border border-yellow-500/60 focus:border-yellow-400 focus-visible:shadow-none h-11"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-2 border-border">
                  {ASSETS.map((a, i) => (
                    <SelectItem
                      key={a}
                      value={a}
                      className={i < ASSETS.length - 1 ? SELECT_ITEM_CLASS : SELECT_ITEM_CLASS.replace(" border-b border-border", "")}
                    >
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                {t("create_round.market.select_asset_help")}
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="position"
                className="text-foreground font-semibold uppercase text-xs tracking-wider flex items-center gap-2"
              >
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                  4
                </span>
                {t("create_round.market.your_prediction")}
              </Label>
              <Select
                value={position}
                onValueChange={(value) => setPosition(value as Position)}
              >
                <SelectTrigger
                  id="position"
                  className="bg-input border border-yellow-500/60 focus:border-yellow-400 focus-visible:shadow-none h-11"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-2 border-border">
                  <SelectItem
                    value="UP"
                    className={SELECT_ITEM_CLASS}
                  >
                    <span className="flex items-center gap-2">
                      <ChevronUp className="w-4 h-4 text-green-500" />
                      {t("create_round.market.position_up_label")}
                    </span>
                  </SelectItem>
                  <SelectItem
                    value="DOWN"
                    className="focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <ChevronDown className="w-4 h-4 text-red-500" />
                      {t("create_round.market.position_down_label")}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                {t("create_round.market.your_prediction_help")}
              </p>
            </div>
          </div>
        </div>

        {/* Amount Section */}
        <div className="space-y-4 p-4 border border-border/50 rounded-md bg-card/30">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary font-semibold border-b border-border pb-2">
            <DollarSign className="w-4 h-4" />
            {t("create_round.steps.step_3")}
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="amount"
              className="text-foreground font-semibold uppercase text-xs tracking-wider flex items-center gap-2"
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                5
              </span>
              {t("create_round.amount.bet_amount")}
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="1"
                min={minBetAmount}
                max={maxBetAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t("create_round.amount.enter_amount")}
                className="bg-input border border-yellow-500/60 focus:border-yellow-400 focus-visible:shadow-none h-11 pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                USDC
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>
                {t("create_round.amount.min_label", { amount: minBetAmount })}{" "}
                USDC
              </span>
              <span>
                {t("create_round.amount.max_label", { amount: maxBetAmount })}{" "}
                USDC
              </span>
            </div>
          </div>
        </div>

        {showTimeWarning && (
          <Alert className="border-yellow-500/60 bg-yellow-500/10 text-foreground">
            <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
            <AlertDescription className="ml-2">
              {t("create_round.warnings.short_timeframe")}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert
            variant="destructive"
            className="border-destructive bg-destructive/10"
          >
            <XCircle className="w-4 h-4 shrink-0" />
            <AlertDescription className="ml-2">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-primary bg-primary/10 text-foreground">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <AlertDescription className="ml-2">{success}</AlertDescription>
          </Alert>
        )}

        <ContractButton
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold uppercase tracking-wider"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <Loader2 className="-ml-1 mr-3 h-5 w-5 animate-spin" />
              {t("create_round.actions.creating")}
            </span>
          ) : (
            t("create_round.actions.create_round")
          )}
        </ContractButton>
      </form>
    </CardTemplate>
  );
};
