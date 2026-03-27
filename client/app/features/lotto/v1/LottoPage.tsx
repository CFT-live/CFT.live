import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { request } from "graphql-request";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import OpenDraws from "@/app/features/lotto/v1/components/OpenDraws";
import ClosedDraws from "@/app/features/lotto/v1/components/ClosedDraws";
import { DEFAULT_HEADERS } from "@/app/queries/headers";
import {
  getOpenDrawsQuery,
  getClosedDrawsQuery,
  getDrawsWithWinnerQuery,
  getGlobalStatsQuery,
} from "@/app/features/lotto/v1/queries/lotto";
import { getMetadata } from "@/app/features/lotto/v1/api/actions.lotto";
import { ContractMetadata } from "@/app/features/lotto/v1/components/LottoMetadata";
import { LottoAdminCard } from "@/app/features/lotto/v1/components/LottoAdminCard";
import { HeroPrizePool } from "@/app/features/lotto/v1/components/HeroPrizePool";
import { GlobalStats } from "@/app/features/lotto/v1/components/GlobalStats";
import { UserStats } from "@/app/features/lotto/v1/components/UserStats";
import { RecentWinners } from "@/app/features/lotto/v1/components/RecentWinners";
import { Card, CardContent } from "@/components/ui/card";
import { REFRESH_INTERVAL_MILLIS } from "@/app/helpers";
import {
  LOTTO_OPEN_DRAWS_QUERY_KEY,
  LOTTO_CLOSED_DRAWS_QUERY_KEY,
  LOTTO_WINNER_DRAWS_QUERY_KEY,
  LOTTO_CONTRACT_METADATA_QUERY_KEY,
  LOTTO_GLOBAL_STATS_QUERY_KEY,
} from "./queries/keys";
import { Instructions } from "@/app/features/root/v1/components/Instructions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lotto");

  return {
    title: t("meta_title"),
    description: t("meta_description"),
  };
}

export default async function LottoPage() {
  const t = await getTranslations("lotto");
  const instructions = [
    t("instructions_step_buy_ticket"),
    t("instructions_step_buy_multiple"),
    t("instructions_step_close_draw"),
    t("instructions_step_claim_prize"),
    t("instructions_step_new_draw"),
    t("instructions_step_check_closed"),
  ];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: t("meta_title"),
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    description: t("meta_description"),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'ETH'
    }
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Conservative default for server-side prefetching
        // Client-side components override with their own optimal values
        staleTime: REFRESH_INTERVAL_MILLIS.medium,
      },
    },
  });

  // Prefetch all draws data
  await Promise.all([
    // Prefetch open draws data
    queryClient.prefetchQuery({
      queryKey: [LOTTO_OPEN_DRAWS_QUERY_KEY],
      async queryFn() {
        return await request(
          process.env.NEXT_PUBLIC_LOTTO_THE_GRAPH_API_URL!,
          getOpenDrawsQuery,
          { first: 10, skip: 0 },
          DEFAULT_HEADERS
        );
      },
    }),
    // Prefetch closed draws data
    queryClient.prefetchQuery({
      queryKey: [LOTTO_CLOSED_DRAWS_QUERY_KEY],
      async queryFn() {
        return await request(
          process.env.NEXT_PUBLIC_LOTTO_THE_GRAPH_API_URL!,
          getClosedDrawsQuery,
          { first: 10, skip: 0 },
          DEFAULT_HEADERS
        );
      },
    }),
    // Prefetch winner draws data
    queryClient.prefetchQuery({
      queryKey: [LOTTO_WINNER_DRAWS_QUERY_KEY],
      async queryFn() {
        return await request(
          process.env.NEXT_PUBLIC_LOTTO_THE_GRAPH_API_URL!,
          getDrawsWithWinnerQuery,
          { first: 10, skip: 0 },
          DEFAULT_HEADERS
        );
      },
    }),
    // Prefetch global stats
    queryClient.prefetchQuery({
      queryKey: [LOTTO_GLOBAL_STATS_QUERY_KEY],
      async queryFn() {
        return await request(
          process.env.NEXT_PUBLIC_LOTTO_THE_GRAPH_API_URL!,
          getGlobalStatsQuery,
          {},
          DEFAULT_HEADERS
        );
      },
    }),
    // Prefetch contract metadata - IMPORTANT: Keep in cache for client-side invalidations
    queryClient.prefetchQuery({
      queryKey: [LOTTO_CONTRACT_METADATA_QUERY_KEY],
      queryFn: getMetadata,
    }),
  ]);

  // Get the prefetched data from cache
  const contractMetadata = queryClient.getQueryData<
    Awaited<ReturnType<typeof getMetadata>>
  >([LOTTO_CONTRACT_METADATA_QUERY_KEY]);

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
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 border-b border-border pb-6 sm:pb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2 sm:mb-3 uppercase tracking-wider">
            {t("title")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 max-w-2xl mx-auto uppercase tracking-wide">
            {t("tagline")}
          </p>
          <Instructions
            title={t("instructions_title")}
            instructions={instructions}
            toggleOpenLabel={t("instructions_read_file")}
            toggleCloseLabel={t("instructions_close_file")}
            footerLeftLabel={t("instructions_end_of_file")}
            footerRightLabel={t("instructions_lines", { count: instructions.length })}
          />
        </div>
        {/* Contract Metadata */}
        <div className="mt-6 sm:mt-8">
          <ContractMetadata />
        </div>
        <HydrationBoundary state={dehydrate(queryClient)}>
          {/* Hero: animated prize pool + CTA */}
          <HeroPrizePool />

          {/* Global stats bar */}
          <GlobalStats />

          {/* User stats (visible only when wallet connected) */}
          <UserStats />

          {/* Draws */}
          <div className="space-y-6">
            <OpenDraws />
          </div>

          {/* Recent winners */}
          <div className="mt-6 sm:mt-8">
            <RecentWinners />
          </div>

          {/* Completed draws with pagination */}
          <div className="space-y-6">
            <ClosedDraws />
          </div>
        </HydrationBoundary>
        {/* Admin section */}
        <LottoAdminCard contractOwnerAddress={contractMetadata.ownerAddress} />
      </div>
    </div>
  );
}
