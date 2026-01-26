import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { request } from "graphql-request";
import { DEFAULT_HEADERS } from "@/app/queries/headers";
import { getTableByIdQuery } from "@/app/features/roulette/v1/queries/roulette";
import { ROULETTE_TABLE_DETAIL_QUERY_KEY } from "../queries/keys";
import { REFRESH_INTERVAL_MILLIS } from "@/app/helpers";
import { RouletteGame } from "./game/RouletteGame";
import { Card, CardContent } from "@/components/ui/card";
import { Table } from "@/app/features/roulette/v1/queries/roulette.types";
import { getTranslations } from "next-intl/server";

export default async function DrawTable({
  tableId,
}: Readonly<{ tableId: string }>) {
  const t = await getTranslations("roulette");
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: [ROULETTE_TABLE_DETAIL_QUERY_KEY, tableId],
    queryFn: async () => {
      return await request(
        process.env.NEXT_PUBLIC_ROULETTE_THE_GRAPH_API_URL!,
        getTableByIdQuery,
        { tableId },
        DEFAULT_HEADERS
      );
    },
    staleTime: REFRESH_INTERVAL_MILLIS.medium,
  });

  // Check if table exists
  const data = queryClient.getQueryData<{ table: Table }>([
    ROULETTE_TABLE_DETAIL_QUERY_KEY,
    tableId,
  ]);

  if (!data?.table) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {t("draw_table_not_found")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RouletteGame tableId={tableId} />
        </div>
      </div>
    </HydrationBoundary>
  );
}
