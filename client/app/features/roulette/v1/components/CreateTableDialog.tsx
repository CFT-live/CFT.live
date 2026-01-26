"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCreateTable } from "@/app/features/roulette/v1/hooks/useCreateTable";
import { useContractMetadata } from "@/app/features/roulette/v1/hooks/useContractMetadataRoulette";
import { AutoClearingAlert } from "@/app/features/root/v1/components/AutoClearingAlert";
import { Loader2 } from "lucide-react";
import { ContractButton } from "@/app/features/root/v1/components/ContractButton";

const MAX_PLAYERS = 10;

interface CreateTableDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export const CreateTableDialog: React.FC<CreateTableDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const t = useTranslations("roulette");

  const { data: metadata } = useContractMetadata();
  const [betAmount, setBetAmount] = useState("1");
  const [maxIncrement, setMaxIncrement] = useState("1");
  const [maxPlayers, setMaxPlayers] = useState("5");

  const {
    createTable,
    isLoading,
    isSuccess,
    errorMessage,
    reset,
  } = useCreateTable();

  const handleSubmit = (e: React.FormEvent) => {
    console.log("Submitting create table form");
    e.preventDefault();
    const bet = Number.parseFloat(betAmount);
    const increment = Number.parseFloat(maxIncrement);
    const players = Number.parseInt(maxPlayers);

    if (
      Number.isNaN(bet) ||
      Number.isNaN(increment) ||
      Number.isNaN(players) ||
      players < 2 ||
      players > MAX_PLAYERS
    ) {
      console.error("Invalid table parameters");
      return;
    }

    createTable(bet, increment, players);
  };

  const handleClose = () => {
    setBetAmount("1");
    setMaxIncrement("1");
    setMaxPlayers("5");
    reset();
    onOpenChange(false);
  };

  if (isSuccess) {
    setTimeout(() => handleClose(), 1500);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("create_table_title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("create_table_description")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="betAmount">
              {t("create_table_initial_bet_label")}
              {metadata && (
                <span className="text-muted-foreground text-xs ml-2">
                  {t("create_table_min_max_hint", {
                    min: metadata.minBetAmount,
                    max: metadata.maxBetAmount,
                  })}
                </span>
              )}
            </Label>
            <Input
              id="betAmount"
              type="number"
              step="0.01"
              placeholder="1"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              min={metadata?.minBetAmount}
              max={metadata?.maxBetAmount}
              required
            />
            <p className="text-xs text-muted-foreground">
              {t("create_table_initial_bet_help")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxIncrement">{t("create_table_max_increment_label")}</Label>
            <Input
              id="maxIncrement"
              type="number"
              step="0.01"
              placeholder="1"
              value={maxIncrement}
              onChange={(e) => setMaxIncrement(e.target.value)}
              min="0"
              required
            />
            <p className="text-xs text-muted-foreground">
              {t("create_table_max_increment_help")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxPlayers">{t("create_table_max_players_label")}</Label>
            <Input
              id="maxPlayers"
              type="number"
              placeholder="5"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              min="2"
              max={MAX_PLAYERS}
              required
            />
            <p className="text-xs text-muted-foreground">
              {t("create_table_max_players_help", { maxPlayers: MAX_PLAYERS })}
            </p>
          </div>

          {errorMessage && (
            <AutoClearingAlert
              message={errorMessage}
              variant="destructive"
            />
          )}

          {isSuccess && (
            <Alert>
              <AlertDescription>
                {t("create_table_success")}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              {t("common_cancel")}
            </Button>
            <ContractButton
              type="submit"
              disabled={isLoading || !betAmount || !maxIncrement || !maxPlayers}
              className="flex-1"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("create_table_submit")}
            </ContractButton>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};
