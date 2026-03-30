import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { request } from "graphql-request";
import type { Metadata } from "next";

import ClosedRounds from "@/app/features/prediction/v1/components/ClosedRounds";
import OpenRounds from "@/app/features/prediction/v1/components/OpenRounds";
import LiveRounds from "@/app/features/prediction/v1/components/LiveRounds";
import { DEFAULT_HEADERS } from "@/app/queries/headers";
import {
  getClosedRoundsQuery,
  getOpenRoundsQuery,
  getLiveRoundsQuery,
} from "@/app/features/prediction/v1/queries/predictionMarket";
import { UserBets } from "@/app/features/prediction/v1/components/UserBets";
import { ContractBalance } from "@/app/features/prediction/v1/components/ContractBalance";
import { CreateRound } from "@/app/features/prediction/v1/components/CreateRound";
import { getContractMetadata } from "@/app/features/prediction/v1/api/actions";
import { ContractMetadata } from "@/app/features/prediction/v1/components/ContractMetadata";
import { Card, CardContent } from "@/components/ui/card";
import { REFRESH_INTERVAL_MILLIS } from "@/app/helpers";
import { AdvanceState } from "@/app/features/prediction/v1/components/admin/AdvanceState";
import { FeeCollectorInfo } from "@/app/features/prediction/v1/components/admin/FeeCollectorInfo";
import {
  CLOSED_ROUNDS_QUERY_KEY,
  CONTRACT_METADATA_QUERY_KEY,
  LIVE_ROUNDS_QUERY_KEY,
  OPEN_ROUNDS_QUERY_KEY,
} from "./queries/keys";
import { ShowUserBets } from "@/app/features/prediction/v1/components/admin/ShowUserBets";
import { PriceData } from "@/app/features/prediction/v1/components/PriceData";
import { PlatformStats } from "@/app/features/prediction/v1/components/PlatformStats";
import { RecentActivity } from "@/app/features/prediction/v1/components/RecentActivity";
import { UserPerformance } from "@/app/features/prediction/v1/components/UserPerformance";
import { ShowUserBalance } from "@/app/features/prediction/v1/components/admin/ShowUserBalance";
import { SetMinLockTime } from "@/app/features/prediction/v1/components/admin/SetMinLockTime";
import { SetMinOpenTime } from "@/app/features/prediction/v1/components/admin/SetMinOpenTime";
import { SetBetLimits } from "@/app/features/prediction/v1/components/admin/SetBetLimits";
import { SetFeeConfig } from "@/app/features/prediction/v1/components/admin/SetFeeConfig";
import { SetPriceFeedETH } from "@/app/features/prediction/v1/components/admin/SetPriceFeedETH";
import { SetPriceFeedARB } from "@/app/features/prediction/v1/components/admin/SetPriceFeedARB";
import { SetPauseState } from "@/app/features/prediction/v1/components/admin/SetPauseState";
import { SetBetLockBuffer } from "@/app/features/prediction/v1/components/admin/SetBetLockBuffer";
import { SetDataWaitWindow } from "@/app/features/prediction/v1/components/admin/SetDataWaitWindow";
import { SetAdvanceCooldown } from "@/app/features/prediction/v1/components/admin/SetAdvanceCooldown";
import { SetPriceMaxAge } from "@/app/features/prediction/v1/components/admin/SetPriceMaxAge";
import { SetMaxOpenRoundsPerUser } from "@/app/features/prediction/v1/components/admin/SetMaxOpenRoundsPerUser";
import { Instructions } from "@/app/features/root/v1/components/Instructions";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Prediction Market",
  description:
    "Bet on asset price movements. Create bets on UP/DOWN markets. Winner takes the pot.",
};

export default async function PredictionPage() {
  const t = await getTranslations("prediction");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Prediction Market",
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    description:
      "Bet on asset price movements. Create bets on UP/DOWN markets. Winner takes the pot.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "ETH",
    },
  };

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Conservative default for server-side prefetching
        // Client-side components override with their own optimal values
        staleTime: REFRESH_INTERVAL_MILLIS.medium,
      },
    },
  });

  // Prefetch all rounds data
  await Promise.all([
    // Prefetch closed rounds data
    queryClient.prefetchQuery({
      queryKey: [CLOSED_ROUNDS_QUERY_KEY],
      async queryFn() {
        return await request(
          process.env.NEXT_PUBLIC_THE_GRAPH_API_URL!,
          getClosedRoundsQuery,
          { first: 10 },
          DEFAULT_HEADERS,
        );
      },
    }),
    // Prefetch open rounds data
    queryClient.prefetchQuery({
      queryKey: [OPEN_ROUNDS_QUERY_KEY],
      async queryFn() {
        return await request(
          process.env.NEXT_PUBLIC_THE_GRAPH_API_URL!,
          getOpenRoundsQuery,
          {},
          DEFAULT_HEADERS,
        );
      },
    }),
    // Prefetch live rounds data
    queryClient.prefetchQuery({
      queryKey: [LIVE_ROUNDS_QUERY_KEY],
      async queryFn() {
        return await request(
          process.env.NEXT_PUBLIC_THE_GRAPH_API_URL!,
          getLiveRoundsQuery,
          {},
          DEFAULT_HEADERS,
        );
      },
    }),
    // Prefetch contract metadata - IMPORTANT: Keep in cache for client-side invalidations
    queryClient.prefetchQuery({
      queryKey: [CONTRACT_METADATA_QUERY_KEY],
      queryFn: getContractMetadata,
    }),
  ]);

  // Get the prefetched data from cache
  const contractMetadata = queryClient.getQueryData([
    CONTRACT_METADATA_QUERY_KEY,
  ]) as Awaited<ReturnType<typeof getContractMetadata>>;

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

      {/* Hero Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="text-center mb-6 border-b border-border pb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <div className="text-primary">
              <svg
                className="w-10 h-10 mx-auto"
                fill="currentColor"
                viewBox="0 0 20 20"
                strokeWidth="1"
              >
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2 uppercase tracking-wider">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mb-4 max-w-2xl mx-auto uppercase tracking-wide">
            {t("description")}
          </p>
          <Instructions
            title="PREDICTION_MARKET_MANUAL.TXT"
            instructions={[
              t("intro.part1"),
              t("intro.part2"),
              t("intro.part3"),
              t("intro.part4"),
              t("intro.part5"),
              t("intro.part6"),
              t("intro.part7"),
            ]}
          />
        </div>

        {/* Platform stats bar */}
        <PlatformStats />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Live price ticker — full width */}
        <PriceData />
      </div>
      {/* User balance + Create Round — side by side on wide screens */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 gap-6 mt-6 px-4 sm:px-6 lg:px-8 pb-8">
        <ContractBalance />
        <CreateRound
          minOpenTime={contractMetadata.minOpenTimeInSeconds}
          minLockTime={contractMetadata.minLockTimeInSeconds}
          minBetAmount={contractMetadata.minBetAmount}
          maxBetAmount={contractMetadata.maxBetAmount}
        />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Primary CTA — Rounds (most important section first) */}
        <HydrationBoundary state={dehydrate(queryClient)}>
          <div className="space-y-6">
            <OpenRounds />
            <LiveRounds />
          </div>
        </HydrationBoundary>

        {/* Closed rounds + Leaderboard + Recent activity */}
        <div className="grid grid-cols-1 gap-6 mt-6">
          <div className="xl:col-span-2">
            <HydrationBoundary state={dehydrate(queryClient)}>
              <ClosedRounds />
            </HydrationBoundary>
          </div>
          <div className="space-y-6">
            <RecentActivity />
          </div>
        </div>

        {/* User bets + personal performance */}
        <div className="mt-6 space-y-4">
          <UserPerformance />
          <HydrationBoundary state={dehydrate(queryClient)}>
            <UserBets />
          </HydrationBoundary>
        </div>

        {/* Contract metadata — collapsed at bottom */}
        <div className="mt-6">
          <ContractMetadata />
        </div>

        {/* Admin section */}
        <AdvanceState contractOwnerAddress={contractMetadata.ownerAddress} />
        <FeeCollectorInfo
          contractOwnerAddress={contractMetadata.ownerAddress}
        />
        <ShowUserBets contractOwnerAddress={contractMetadata.ownerAddress} />
        <ShowUserBalance contractOwnerAddress={contractMetadata.ownerAddress} />

        {/* Admin Configuration Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <SetMinLockTime
            contractOwnerAddress={contractMetadata.ownerAddress}
          />
          <SetMinOpenTime
            contractOwnerAddress={contractMetadata.ownerAddress}
          />
          <SetBetLimits contractOwnerAddress={contractMetadata.ownerAddress} />
          <SetFeeConfig contractOwnerAddress={contractMetadata.ownerAddress} />
          <SetPriceFeedETH
            contractOwnerAddress={contractMetadata.ownerAddress}
          />
          <SetPriceFeedARB
            contractOwnerAddress={contractMetadata.ownerAddress}
          />
          <SetPauseState
            contractOwnerAddress={contractMetadata.ownerAddress}
            isPaused={contractMetadata.paused}
          />
          <SetBetLockBuffer
            contractOwnerAddress={contractMetadata.ownerAddress}
          />
          <SetDataWaitWindow
            contractOwnerAddress={contractMetadata.ownerAddress}
          />
          <SetAdvanceCooldown
            contractOwnerAddress={contractMetadata.ownerAddress}
          />
          <SetPriceMaxAge
            contractOwnerAddress={contractMetadata.ownerAddress}
          />
          <SetMaxOpenRoundsPerUser
            contractOwnerAddress={contractMetadata.ownerAddress}
          />
        </div>
      </div>
    </div>
  );
}
