"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { ITEMS_PER_PAGE } from "../hooks/useRoundsQuery";

interface RoundsPaginationFooterProps {
  currentPage: number;
  roundCount: number;
  isLoading: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
  showingText: string;
  note?: string;
}

export function RoundsPaginationFooter({
  currentPage,
  roundCount,
  isLoading,
  onPreviousPage,
  onNextPage,
  showingText,
  note,
}: Readonly<RoundsPaginationFooterProps>) {
  const t = useTranslations("prediction");

  return (
    <CardFooter className="flex flex-col gap-3">
      <div className="flex items-center justify-between w-full">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousPage}
          disabled={currentPage === 0 || isLoading}
        >
          {t("rounds.pagination.previous")}
        </Button>
        <span className="text-xs text-muted-foreground">
          {t("rounds.pagination.page", {
            page: currentPage + 1,
            count: roundCount,
          })}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={roundCount < ITEMS_PER_PAGE || isLoading}
        >
          {t("rounds.pagination.next")}
        </Button>
      </div>
      <div className="text-xs text-muted-foreground text-center">
        {showingText}
        {note && <span className="ml-2 font-semibold">{note}</span>}
      </div>
    </CardFooter>
  );
}
