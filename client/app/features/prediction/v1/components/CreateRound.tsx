"use client";

import React, { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useCreateRound } from "../hooks/useCreateRound";
import { useQueryClient } from "@tanstack/react-query";
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
import { Asset, Position } from "../../../../types";
import { MILLIS } from "../../../../helpers";
import {
  CONTRACT_BALANCE_QUERY_KEY,
  OPEN_ROUNDS_QUERY_KEY,
} from "../queries/keys";
import { CardTemplate } from "../../../root/v1/components/CardTemplate";
import { TimePicker } from "./TimePicker";
import { ContractButton } from "../../../root/v1/components/ContractButton";

// Note: This should come from contract metadata.
const ROUND_MAX_DURATION_MINUTES = 60 * 24 * 7; // One week

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
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [lockInDate, setLockInDate] = useState<Date>(
    new Date(Date.now() + Number(lockInMinutes) * MILLIS.inMinute)
  );
  const [closeInDate, setCloseInDate] = useState<Date>(
    new Date(
      Date.now() +
        Number(lockInMinutes) * MILLIS.inMinute +
        Number(closeInMinutes) * MILLIS.inMinute
    )
  );

  useEffect(() => {
    setLockInDate(new Date(Date.now() + Number(lockInMinutes) * MILLIS.inMinute));
    setCloseInDate(
      new Date(
        Date.now() +
          Number(lockInMinutes) * MILLIS.inMinute +
          Number(closeInMinutes) * MILLIS.inMinute
      )
    );
  }, [lockInMinutes, closeInMinutes]);

  // Clear error when user changes any field value
  useEffect(() => {
    if (error) {
      setError(null);
    }
    if (success) {
      setSuccess(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockInMinutes, closeInMinutes, asset, position, amount]);

  const onSuccess = useCallback(() => {
    setSuccess(t("create_round.success.round_created"));
    setAmount("");
    setTimeout(() => {
      // Creating a round affects open rounds and user's balance
      queryClient.invalidateQueries({ queryKey: [OPEN_ROUNDS_QUERY_KEY] });
      queryClient.invalidateQueries({
        queryKey: [CONTRACT_BALANCE_QUERY_KEY],
      });
    }, 3 * MILLIS.inSecond);
  }, [queryClient, t]);

  const { createRound, isLoading, errorMessage } = useCreateRound(onSuccess);

  useEffect(() => {
    setShowTimeWarning(Number(lockInMinutes) < 5 || Number(closeInMinutes) < 5);
  }, [lockInMinutes, closeInMinutes]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const lockMinutesNum = Number(lockInMinutes);
    const closeMinutesNum = Number(closeInMinutes);

    // Basic validation (minutes)
    if (!Number.isFinite(lockMinutesNum) || !Number.isFinite(closeMinutesNum)) {
      setError(t("create_round.errors.lock_close_minutes_valid_numbers"));
      return;
    }
    if (lockMinutesNum <= 0 || closeMinutesNum <= 0) {
      setError(t("create_round.errors.minutes_greater_than_zero"));
      return;
    }
    if (lockMinutesNum * 60 < minOpenTime) {
      setError(
        t("create_round.errors.open_minutes_at_least_seconds", {
          seconds: minOpenTime,
        })
      );
      return;
    }
    if (closeMinutesNum * 60 < minLockTime) {
      setError(
        t("create_round.errors.lock_minutes_at_least_seconds", {
          seconds: minLockTime,
        })
      );
      return;
    }
    if (closeMinutesNum > ROUND_MAX_DURATION_MINUTES) {
      setError(
        t("create_round.errors.close_minutes_cannot_exceed", {
          minutes: ROUND_MAX_DURATION_MINUTES,
        })
      );
      return;
    }
    if (lockMinutesNum > ROUND_MAX_DURATION_MINUTES) {
      setError(
        t("create_round.errors.lock_minutes_cannot_exceed", {
          minutes: ROUND_MAX_DURATION_MINUTES,
        })
      );
      return;
    }
    if (!amount) {
      setError(t("create_round.errors.amount_required"));
      return;
    }

    // This component expects an integer amount (no decimals). If you need decimals
    // (e.g. token with 18 decimals) convert using a library like ethers.js and the token's decimals.
    if (amount.includes(".")) {
      setError(t("create_round.errors.amount_must_be_integer"));
      return;
    }
    if (!/^\d+$/.test(amount)) {
      setError(t("create_round.errors.amount_invalid"));
      return;
    }

    // Convert minutes (from now) to absolute seconds since epoch
    const nowSeconds = Math.floor(Date.now() / MILLIS.inSecond);
    // Add small buffer to avoid exact minute edge cases
    const lockAtSeconds =
      Math.floor(nowSeconds + lockMinutesNum * 60) +
      (lockMinutesNum === 1 ? 30 : 0);
    const closeAtSeconds =
      Math.floor(lockAtSeconds + closeMinutesNum * 60) +
      (closeMinutesNum === 1 ? 1 : 0);

    createRound(
      lockAtSeconds,
      closeAtSeconds,
      asset,
      position.toUpperCase() as Position,
      amount
    );
  };

  useEffect(() => {
    if (errorMessage) {
      setError(errorMessage);
    }
  }, [errorMessage]);

  return (
    <CardTemplate
      title={t("create_round.title")}
      description={t("create_round.description")}
      isRefreshing={false}
    >
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Timing Section */}
        <div className="space-y-4 p-4 border border-border/50 rounded-md bg-card/30">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary font-semibold border-b border-border pb-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
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
                    if (minutes > 0) {
                      setLockInMinutes(minutes.toString());
                    }
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
                    if (minutes > 0) {
                      setCloseInMinutes(minutes.toString());
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Market Selection Section */}
        <div className="space-y-4 p-4 border border-border/50 rounded-md bg-card/30">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary font-semibold border-b border-border pb-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
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
                  <SelectItem
                    value="ETH"
                    className="focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground border-b border-border"
                  >
                    ETH
                  </SelectItem>
                  <SelectItem
                    value="ARB"
                    className="focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground border-b border-border"
                  >
                    ARB
                  </SelectItem>
                  <SelectItem
                    value="AAVE"
                    className="focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground border-b border-border"
                  >
                    AAVE
                  </SelectItem>
                  <SelectItem
                    value="BTC"
                    className="focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground border-b border-border"
                  >
                    BTC
                  </SelectItem>
                  <SelectItem
                    value="SOL"
                    className="focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground border-b border-border"
                  >
                    SOL
                  </SelectItem>
                  <SelectItem
                    value="XRP"
                    className="focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground border-b border-border"
                  >
                    XRP
                  </SelectItem>
                  <SelectItem
                    value="BNB"
                    className="focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground border-b border-border"
                  >
                    BNB
                  </SelectItem>
                  <SelectItem
                    value="DOGE"
                    className="focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground border-b border-border"
                  >
                    DOGE
                  </SelectItem>
                  <SelectItem
                    value="PEPE"
                    className="focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground border-b border-border"
                  >
                    PEPE
                  </SelectItem>
                  <SelectItem
                    value="SHIB"
                    className="focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    SHIB
                  </SelectItem>
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
                    className="focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground border-b border-border"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                      {t("create_round.market.position_up_label")}
                    </span>
                  </SelectItem>
                  <SelectItem
                    value="DOWN"
                    className="focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
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
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
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
            <svg
              className="w-4 h-4 text-yellow-500 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
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
            <svg
              className="w-4 h-4 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <AlertDescription className="ml-2">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-primary bg-primary/10 text-foreground">
            <svg
              className="w-4 h-4 text-primary shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
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
              <svg
                className="-ml-1 mr-3 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
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
