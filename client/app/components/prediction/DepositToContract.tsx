"use client";

import { useCallback, useEffect, useState } from "react";
import { useDepositToContract } from "../../hooks/useDepositToContract";
import {
  erc20Abi,
  PREDICTION_MARKET_ADDRESS,
  USDC_ADDRESS,
} from "../../lib/contracts";
import { useReadContract, useWriteContract } from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import { usdcToWei } from "../../helpers";
import { maxUint256 } from "viem";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { CONTRACT_BALANCE_QUERY_KEY } from "../../queries/keys";
import { AllowanceWarning } from "../AllowanceWarning";
import { ContractButton } from "../ContractButton";
import { useTranslations } from "next-intl";

export const DepositToContract = () => {
  const t = useTranslations("prediction.contract_balance");
  const { address } = useAppKitAccount();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [showAllowanceWarning, setShowAllowanceWarning] = useState(false);

  const onSuccess = useCallback(() => {
    console.log("Deposit successful, refetching balance...");
    queryClient.invalidateQueries({ queryKey: [CONTRACT_BALANCE_QUERY_KEY] });
    setAmount("");
  }, [queryClient]);

  const { deposit, isLoading, isSuccess, errorMessage } =
    useDepositToContract(onSuccess);

  const {
    mutate,
    isPending,
    data: allowanceUpdateHash,
  } = useWriteContract();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address as `0x${string}`, PREDICTION_MARKET_ADDRESS] : undefined,
    query: { enabled: Boolean(address) },
  });

  const handleDeposit = async () => {
    const value = Number.parseFloat(amount);
    if (Number.isNaN(value) || value <= 0) {
      return;
    }
    try {
      deposit(value);
    } catch (err) {
      console.error(err);
    }
  };

  const requestUnlimitedAllowance = () => {
    if (isPending) return;
    const value = maxUint256;
    mutate({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [PREDICTION_MARKET_ADDRESS, value],
    });
  };

  useEffect(() => {
    if (allowance !== undefined) {
      const allowanceNumber = Number(allowance);
      const amountNumber = Number(usdcToWei(amount || "0"));
      setShowAllowanceWarning(allowanceNumber < amountNumber);
    }
  }, [allowance, amount]);

  useEffect(() => {
    if (allowanceUpdateHash) {
      refetchAllowance();
    }
  }, [allowanceUpdateHash, refetchAllowance]);

  return (
    <div className="flex flex-col space-y-3">
      <Input
        type="number"
        placeholder={t("Amount_to_deposit")}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        min="1"
        step="1"
      />
      <ContractButton
        onClick={handleDeposit}
        disabled={isLoading || !amount}
        className="w-full"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="-ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
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
            {t("Depositing")}
          </span>
        ) : (
          t("Deposit")
        )}
      </ContractButton>
      <AllowanceWarning
        isVisible={showAllowanceWarning}
        requestUnlimitedAllowance={requestUnlimitedAllowance}
        isPending={isPending}
      />
      {isSuccess && (
        <div className="text-primary text-sm flex items-center">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          {t("Deposit_success")}
        </div>
      )}
      {errorMessage && (
        <div className="text-red-400 text-sm flex items-start">
          <svg
            className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          {errorMessage}
        </div>
      )}
    </div>
  );
};
