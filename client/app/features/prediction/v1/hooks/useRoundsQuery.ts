"use client";

import { useState } from "react";
import { request } from "graphql-request";
import { useTranslations } from "next-intl";
import { DEFAULT_HEADERS } from "../../../../queries/headers";
import { useQuery } from "./useQuery";
import { REFRESH_INTERVAL_MILLIS } from "../../../../helpers";
import type { Round } from "../../../../types";

export const ITEMS_PER_PAGE = 10;

interface RoundsData {
  rounds: Round[];
}

export function useRoundsQuery<T extends RoundsData>(
  queryKey: string,
  graphqlQuery: string,
) {
  const t = useTranslations("prediction");
  const [currentPage, setCurrentPage] = useState(0);

  const result = useQuery<T>({
    queryKey: [queryKey, currentPage],
    async queryFn(): Promise<T> {
      try {
        const res = await request(
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-non-null-assertion
          process.env.NEXT_PUBLIC_THE_GRAPH_API_URL!,
          graphqlQuery,
          { first: ITEMS_PER_PAGE, skip: currentPage * ITEMS_PER_PAGE },
          DEFAULT_HEADERS,
        );
        return res as T;
      } catch (err) {
        if (err instanceof Error) {
          throw new Error(t("rounds.errors.graphql_error", { message: err.message }));
        }
        throw err;
      }
    },
    retry: (failureCount, error) => {
      if (error?.message?.includes("fetch")) return failureCount < 2;
      return failureCount < 3;
    },
    staleTime: REFRESH_INTERVAL_MILLIS.medium,
    refetchInterval: REFRESH_INTERVAL_MILLIS.medium,
  });

  const handlePreviousPage = () => setCurrentPage((p) => Math.max(0, p - 1));
  const handleNextPage = () => {
    if (result.data?.rounds.length === ITEMS_PER_PAGE) {
      setCurrentPage((p) => p + 1);
    }
  };

  return { ...result, currentPage, handlePreviousPage, handleNextPage };
}
