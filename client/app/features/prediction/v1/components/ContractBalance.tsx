"use client";

import { useTranslations } from "next-intl";

import { DepositToContract } from "./DepositToContract";
import { WithdrawFromContract } from "./WithdrawFromContract";
import { ErrorState } from "./ErrorState";
import {
  PREDICTION_MARKET_ABI,
  PREDICTION_MARKET_ADDRESS,
} from "../../../../lib/contracts";
import { useChainId, useConfig } from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import { REFRESH_INTERVAL_MILLIS, weiToUsdcString } from "../../../../helpers";
import { readContract } from "wagmi/actions";
import { CONTRACT_BALANCE_QUERY_KEY } from "../queries/keys";
import { useQuery } from "../hooks/useQuery";
import { CardTemplate } from "../../../root/v1/components/CardTemplate";
import { Skeleton } from "@/components/ui/skeleton";

export const ContractBalance = () => {
  const t = useTranslations("prediction");
  const { address, isConnected } = useAppKitAccount();
  const chainId = useChainId();
  const config = useConfig();

  const { data, refetch, isLoading, isError } = useQuery<bigint | null>({
    queryKey: [CONTRACT_BALANCE_QUERY_KEY, address, chainId],
    queryFn: async () => {
      if (!address || !isConnected) return null;

      const balance = await readContract(config, {
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_ABI,
        functionName: "getUserBalance",
        account: address as `0x${string}`,
        args: [],
      });
      return balance as bigint;
    },
    enabled: isConnected && !!address,
    retry: false,
    staleTime: REFRESH_INTERVAL_MILLIS.medium,
    refetchInterval: false, // No auto-refetch - updated via invalidations after user actions
  });

  if (!isConnected) {
    return (
      <div className="bg-card border border-border rounded px-4 py-3">
        <p className="text-xs text-muted-foreground text-center">
          {t("contract_balance.connect_prompt")}
        </p>
      </div>
    );
  }

  return (
    <CardTemplate
      title={t("contract_balance.title")}
      description={t("contract_balance.description")}
      isRefreshing={isLoading}
      refresh={refetch}
    >
      {isError ? (
        <ErrorState title={t("contract_balance.error_title")} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DepositToContract />
            <WithdrawFromContract />
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {t("contract_balance.available")}
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-32 ml-auto" />
            ) : (
              <p className="text-2xl font-bold">
                {data == null ? "-" : weiToUsdcString(data)} USDC
              </p>
            )}
          </div>
        </>
      )}
    </CardTemplate>
  );
};
