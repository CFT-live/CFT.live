"use client";

import { useTranslations } from "next-intl";

import { DepositToContract } from "./DepositToContract";
import { WithdrawFromContract } from "./WithdrawFromContract";
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

export const ContractBalance = () => {
  const t = useTranslations("prediction");
  const { address, isConnected } = useAppKitAccount();
  const chainId = useChainId();
  const config = useConfig();

  const { data, refetch, isLoading } = useQuery({
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
      return balance;
    },
    enabled: isConnected && !!address,
    retry: false,
    staleTime: REFRESH_INTERVAL_MILLIS.medium,
    refetchInterval: false, // No auto-refetch - updated via invalidations after user actions
  });

  return (
    <CardTemplate
      title={t("contract_balance.title")}
      description={t("contract_balance.description")}
      isRefreshing={isLoading}
      refresh={refetch}
    >
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DepositToContract />
          <WithdrawFromContract />
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">
            {t("contract_balance.available")}
          </p>
          <p className="text-2xl font-bold">
            {data === undefined ? "-" : weiToUsdcString(data as bigint)} USDC
          </p>
        </div>
      </>
    </CardTemplate>
  );
};
