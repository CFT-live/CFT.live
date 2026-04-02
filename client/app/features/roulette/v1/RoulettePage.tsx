import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { request } from "graphql-request";
import type { Metadata } from "next";

import { DEFAULT_HEADERS } from "@/app/queries/headers";
import {
  getOpenTablesQuery,
  getInProgressTablesQuery,
  getGlobalStatsQuery,
  getTableByIdQuery,
} from "@/app/features/roulette/v1/queries/roulette";
import { getMetadata } from "./api/actions.roulette";
import { ContractMetadata } from "./components/RouletteMetadata";
import { OpenTables } from "./components/OpenTables";
import { ActiveTables } from "./components/ActiveTables";
import { GlobalStats } from "./components/GlobalStats";
import { RouletteAdminCard } from "./components/RouletteAdminCard";
import { Card, CardContent } from "@/components/ui/card";
import { REFRESH_INTERVAL_MILLIS } from "@/app/helpers";
import {
  ROULETTE_OPEN_TABLES_QUERY_KEY,
  ROULETTE_IN_PROGRESS_TABLES_QUERY_KEY,
  ROULETTE_CONTRACT_METADATA_QUERY_KEY,
  ROULETTE_GLOBAL_STATS_QUERY_KEY,
  ROULETTE_TABLE_DETAIL_QUERY_KEY,
} from "./queries/keys";
import { Instructions } from "@/app/features/root/v1/components/Instructions";
import { RouletteGame } from "./components/game/RouletteGame";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("roulette");

  return {
    title: t("meta_title"),
    description: t("meta_description"),
  };
}

interface RoulettePageProps {
  searchParams: Promise<{ tableId?: string }>;
}

export default async function RoulettePage({
  searchParams,
}: Readonly<RoulettePageProps>) {
  const t = await getTranslations("roulette");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: t("meta_title"),
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    description: t("meta_description"),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "ETH",
    },
  };

  const { tableId } = await searchParams;
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: REFRESH_INTERVAL_MILLIS.medium,
      },
    },
  });

  // Build prefetch queries array
  const prefetchQueries = [
    // Prefetch open tables
    queryClient.prefetchQuery({
      queryKey: [ROULETTE_OPEN_TABLES_QUERY_KEY],
      async queryFn() {
        return await request(
          process.env.NEXT_PUBLIC_ROULETTE_THE_GRAPH_API_URL!,
          getOpenTablesQuery,
          { first: 20, skip: 0 },
          DEFAULT_HEADERS,
        );
      },
    }),
    // Prefetch in-progress tables
    queryClient.prefetchQuery({
      queryKey: [ROULETTE_IN_PROGRESS_TABLES_QUERY_KEY],
      async queryFn() {
        return await request(
          process.env.NEXT_PUBLIC_ROULETTE_THE_GRAPH_API_URL!,
          getInProgressTablesQuery,
          { first: 20, skip: 0 },
          DEFAULT_HEADERS,
        );
      },
    }),
    // Prefetch global stats
    queryClient.prefetchQuery({
      queryKey: [ROULETTE_GLOBAL_STATS_QUERY_KEY],
      async queryFn() {
        return await request(
          process.env.NEXT_PUBLIC_ROULETTE_THE_GRAPH_API_URL!,
          getGlobalStatsQuery,
          {},
          DEFAULT_HEADERS,
        );
      },
    }),
    // Prefetch contract metadata
    queryClient.prefetchQuery({
      queryKey: [ROULETTE_CONTRACT_METADATA_QUERY_KEY],
      queryFn: getMetadata,
    }),
  ];

  // If a table is selected, prefetch its data
  if (tableId) {
    prefetchQueries.push(
      queryClient.prefetchQuery({
        queryKey: [ROULETTE_TABLE_DETAIL_QUERY_KEY, tableId],
        async queryFn() {
          return await request(
            process.env.NEXT_PUBLIC_ROULETTE_THE_GRAPH_API_URL!,
            getTableByIdQuery,
            { tableId },
            DEFAULT_HEADERS,
          );
        },
        staleTime: REFRESH_INTERVAL_MILLIS.medium,
      }),
    );
  }

  // Prefetch all data
  await Promise.all(prefetchQueries);

  // Get the prefetched data from cache
  const contractMetadata = queryClient.getQueryData<
    Awaited<ReturnType<typeof getMetadata>>
  >([ROULETTE_CONTRACT_METADATA_QUERY_KEY]);

  if (!contractMetadata) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card>
          <CardContent>
            <p className="text-center text-muted-foreground">
              {t("service_unavailable")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Hero Section */}
        <div className="text-center mb-6 sm:mb-8 border-b border-border pb-6 sm:pb-8">
          <h1 className="text-3xl sm:text-5xl font-black text-foreground mb-2 sm:mb-3 uppercase tracking-wider">
            {t("title")}
          </h1>

          <Instructions
            title={t("instructions_title")}
            instructions={[
              t("instructions_step_create_or_join"),
              t("instructions_step_mark_ready"),
              t("instructions_step_your_turn"),
              t("instructions_step_next_player"),
              t("instructions_step_until_one_left"),
              t("instructions_step_claim_winnings"),
            ]}
          />
        </div>

        {/* Global Stats - social proof */}
        <HydrationBoundary state={dehydrate(queryClient)}>
          <GlobalStats />
        </HydrationBoundary>

        {/* Tables Display */}
        <div id="tables-section">
          <HydrationBoundary state={dehydrate(queryClient)}>
            <div className="space-y-4 sm:space-y-6">
              <ActiveTables />
              <OpenTables />
            </div>
          </HydrationBoundary>
        </div>

        {/* Selected Table Display */}
        {tableId && (
          <HydrationBoundary state={dehydrate(queryClient)}>
            <div className="mt-6 sm:mt-8">
              <RouletteGame tableId={tableId} />
            </div>
          </HydrationBoundary>
        )}

        {/* Contract Metadata - technical details at the bottom */}
        <div className="mt-8 sm:mt-12">
          <ContractMetadata />
        </div>

        {/* Admin section */}
        <RouletteAdminCard
          contractOwnerAddress={contractMetadata.ownerAddress}
        />
      </div>
    </div>
  );
}
