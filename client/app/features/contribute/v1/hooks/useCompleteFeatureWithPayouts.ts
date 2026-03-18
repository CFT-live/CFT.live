import { useCallback, useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { arbitrum } from "viem/chains";
import { isAddress } from "viem";
import { useChainId } from "wagmi";
import {
  readContract,
  simulateContract,
  waitForTransactionReceipt,
  writeContract,
} from "@wagmi/core";

import { config } from "@/app/config";
import {
  CFT_TOKEN_ABI,
  CFT_TOKEN_ADDRESS,
  CONTRIBUTOR_DISTRIBUTOR_ABI,
  CONTRIBUTOR_DISTRIBUTOR_ADDRESS,
} from "@/app/lib/contracts";

import {
  createDistribution,
  listDistributions,
  markFeatureComplete,
} from "../api/api";
import type { Contribution, Feature, Task } from "../api/types";
import {
  buildFeaturePayoutPlan,
  type PublicContributor,
} from "../payoutPlanning";

type UseCompleteFeatureWithPayoutsArgs = {
  feature: Feature | null;
  tasks: Task[];
  contributions: Contribution[];
  contributorsById: Record<string, PublicContributor>;
  onCompleted: () => Promise<void>;
  onError: (message: string | null) => void;
  onSuccess: (message: string | null) => void;
};

export type CompletionPayoutStatus =
  | "ready"
  | "in-progress"
  | "confirmed"
  | "already-paid"
  | "failed";

export type CompletionBackendStatus =
  | "not-started"
  | "saved"
  | "failed";

export type CompletionPayoutRow = ReturnType<
  typeof buildFeaturePayoutPlan
>["items"][number] & {
  backendStatus: CompletionBackendStatus;
  errorMessage: string | null;
  payoutStatus: CompletionPayoutStatus;
  txHash: `0x${string}` | null;
};

function shortenErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("User rejected") || message.includes("User denied")) {
    return "Transaction cancelled in wallet.";
  }

  if (message.includes("TaskAlreadyPaid")) {
    return "This payout key has already been paid on-chain.";
  }

  if (message.includes("AccessControlUnauthorizedAccount")) {
    return "Connected wallet does not have payout permissions on the distributor contract.";
  }

  return message.split("\n").slice(0, 2).join(" ");
}

function isAlreadyPaidError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("TaskAlreadyPaid");
}

function getCompletionPrecheckError(args: {
  address: string | undefined;
  chainId: number | undefined;
  feature: Feature | null;
  isConnected: boolean;
}) {
  const { address, chainId, feature, isConnected } = args;

  if (!feature) {
    return "Feature is not loaded yet.";
  }

  if (!isConnected || !address) {
    return "Connect an admin wallet before completing the feature.";
  }

  if (chainId !== arbitrum.id) {
    return "Switch the connected wallet to Arbitrum before completing the feature.";
  }

  if (!isAddress(CFT_TOKEN_ADDRESS)) {
    return "Missing NEXT_PUBLIC_CFT_TOKEN_CONTRACT_ADDRESS.";
  }

  if (!isAddress(CONTRIBUTOR_DISTRIBUTOR_ADDRESS)) {
    return "Missing NEXT_PUBLIC_CONTRIBUTOR_DISTRIBUTOR_CONTRACT_ADDRESS.";
  }

  return null;
}

function createRowsFromPlan(
  plan: ReturnType<typeof buildFeaturePayoutPlan>,
): CompletionPayoutRow[] {
  return plan.items.map((item) => ({
    ...item,
    backendStatus: "not-started",
    errorMessage: null,
    payoutStatus: "ready",
    txHash: null,
  }));
}

async function executeTaskPayout(args: {
  adminAddress: `0x${string}`;
  row: CompletionPayoutRow;
}) {
  const { adminAddress, row } = args;

  const simulation = await simulateContract(config, {
    address: CONTRIBUTOR_DISTRIBUTOR_ADDRESS,
    abi: CONTRIBUTOR_DISTRIBUTOR_ABI,
    functionName: "payout",
    account: adminAddress,
    args: [
      row.contributor.wallet_address as `0x${string}`,
      BigInt(row.tokenAmountRaw),
      row.payoutKeyBytes32,
    ],
  });

  const txHash = await writeContract(config, simulation.request);
  const receipt = await waitForTransactionReceipt(config, { hash: txHash });

  if (receipt.status !== "success") {
    throw new Error(`Payout transaction failed for contribution ${row.contribution.id}.`);
  }

  return txHash;
}

function updateRowInList(
  rows: CompletionPayoutRow[],
  contributionId: string,
  updater: (row: CompletionPayoutRow) => CompletionPayoutRow,
) {
  return rows.map((row) =>
    row.contribution.id === contributionId ? updater(row) : row,
  );
}

export function useCompleteFeatureWithPayouts({
  feature,
  tasks,
  contributions,
  contributorsById,
  onCompleted,
  onError,
  onSuccess,
}: UseCompleteFeatureWithPayoutsArgs) {
  const { address, isConnected } = useAppKitAccount();
  const chainId = useChainId();

  const [dialogError, setDialogError] = useState<string | null>(null);
  const [dialogNotice, setDialogNotice] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [rows, setRows] = useState<CompletionPayoutRow[]>([]);
  const [runningContributionId, setRunningContributionId] = useState<string | null>(null);

  const isCompleting =
    isPreparing || isFinalizing || runningContributionId !== null;

  const completedCount = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.payoutStatus === "confirmed" || row.payoutStatus === "already-paid",
      ).length,
    [rows],
  );
  const totalCount = rows.length;
  const canFinalize =
    !isFinalized &&
    issues.length === 0 &&
    totalCount > 0 &&
    rows.every(
      (row) =>
        row.payoutStatus === "confirmed" || row.payoutStatus === "already-paid",
    );

  const openCompletionDialog = useCallback(async () => {
    onError(null);
    onSuccess(null);
    setDialogError(null);
    setDialogNotice(null);
    setIsFinalized(false);
    setDialogOpen(true);

    const precheckError = getCompletionPrecheckError({
      address,
      chainId,
      feature,
      isConnected,
    });
    if (precheckError) {
      setDialogError(precheckError);
      onError(precheckError);
      return;
    }

    const currentFeature = feature;
    if (!currentFeature) {
      return;
    }

    setIsPreparing(true);
    try {
      const [distributionResult, cftDecimals] = await Promise.all([
        listDistributions({ feature_id: currentFeature.id }),
        readContract(config, {
          address: CFT_TOKEN_ADDRESS,
          abi: CFT_TOKEN_ABI,
          functionName: "decimals",
        }),
      ]);

      const plan = buildFeaturePayoutPlan({
        feature: currentFeature,
        tasks,
        contributions,
        contributorsById,
        existingDistributions: distributionResult.distributions,
        cftDecimals: Number(cftDecimals),
      });

      setIssues(plan.issues.map((issue) => `${issue.taskName}: ${issue.reason}`));
      setRows(createRowsFromPlan(plan));

      if (plan.items.length === 0) {
        setDialogError("No eligible contribution payouts were found for this feature.");
      }
    } catch (error) {
      setDialogError(shortenErrorMessage(error));
    } finally {
      setIsPreparing(false);
    }
  }, [
    address,
    chainId,
    contributions,
    contributorsById,
    feature,
    isConnected,
    onError,
    onSuccess,
    tasks,
  ]);

  const closeCompletionDialog = useCallback((open: boolean) => {
    if (!open && isCompleting) {
      return;
    }
    setDialogOpen(open);
    if (!open) {
      setDialogError(null);
      setDialogNotice(null);
    }
  }, [isCompleting]);

  const runPayoutForContribution = useCallback(async (contributionId: string) => {
    if (!address || runningContributionId !== null || isFinalizing) {
      return;
    }

    const row = rows.find((entry) => entry.contribution.id === contributionId);
    if (
      !row ||
      row.payoutStatus === "confirmed" ||
      row.payoutStatus === "already-paid"
    ) {
      return;
    }

    setDialogError(null);
    setDialogNotice(null);
    setRunningContributionId(contributionId);
    setRows((currentRows) =>
      updateRowInList(currentRows, contributionId, (currentRow) => ({
        ...currentRow,
        errorMessage: null,
        payoutStatus: "in-progress",
      })),
    );

    try {
      const txHash = await executeTaskPayout({
        adminAddress: address as `0x${string}`,
        row,
      });

      setRows((currentRows) =>
        updateRowInList(currentRows, contributionId, (currentRow) => ({
          ...currentRow,
          errorMessage: null,
          payoutStatus: "confirmed",
          txHash,
        })),
      );
    } catch (error) {
      if (isAlreadyPaidError(error)) {
        const message = "This contribution has already been paid on-chain.";
        setRows((currentRows) =>
          updateRowInList(currentRows, contributionId, (currentRow) => ({
            ...currentRow,
            errorMessage: null,
            payoutStatus: "already-paid",
          })),
        );
        setDialogNotice(message);
      } else {
        const message = shortenErrorMessage(error);
        setRows((currentRows) =>
          updateRowInList(currentRows, contributionId, (currentRow) => ({
            ...currentRow,
            errorMessage: message,
            payoutStatus: "failed",
          })),
        );
        setDialogError(message);
      }
    } finally {
      setRunningContributionId(null);
    }
  }, [address, isFinalizing, rows, runningContributionId]);

  const payoutAll = useCallback(async () => {
    const targetRows = rows.filter(
      (row) => row.payoutStatus === "ready" || row.payoutStatus === "failed",
    );

    for (const row of targetRows) {
      // eslint-disable-next-line no-await-in-loop
      await runPayoutForContribution(row.contribution.id);
    }
  }, [rows, runPayoutForContribution]);

  const finalizeCompletion = useCallback(async () => {
    if (!canFinalize || !feature) {
      return;
    }

    setDialogError(null);
    setDialogNotice(null);
    setIsFinalizing(true);
    try {
      await markFeatureComplete(feature.id);

      const persistenceErrors: string[] = [];
      for (const row of rows) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await createDistribution({
            feature_id: feature.id,
            task_id: row.task.id,
            contribution_id: row.contribution.id,
            payout_key: row.payoutKeyBytes32,
            contributor_id: row.contributor.id,
            cp_amount: row.cpAwarded,
            token_amount: row.tokenAmount,
            token_amount_raw: row.tokenAmountRaw,
            transaction_status: "Confirmed",
            arbitrum_tx_hash: row.txHash,
          });

          setRows((currentRows) =>
            updateRowInList(currentRows, row.contribution.id, (currentRow) => ({
              ...currentRow,
              backendStatus: "saved",
            })),
          );
        } catch (error) {
          const message = shortenErrorMessage(error);
          persistenceErrors.push(`${row.task.name} / ${row.contribution.id}: ${message}`);
          setRows((currentRows) =>
            updateRowInList(currentRows, row.contribution.id, (currentRow) => ({
              ...currentRow,
              backendStatus: "failed",
              errorMessage: message,
            })),
          );
        }
      }

      setIsFinalized(true);
      if (persistenceErrors.length > 0) {
        setDialogError(
          `Feature was completed, but some payout records could not be saved:\n${persistenceErrors.join("\n")}`,
        );
        onError(
          `Feature was completed, but some payout records could not be saved:\n${persistenceErrors.join("\n")}`,
        );
      } else {
        const message = `Feature marked as completed and ${rows.length} payout(s) were confirmed.`;
        setDialogNotice(message);
        onSuccess(message);
      }

      await onCompleted();
    } catch (error) {
      const message = shortenErrorMessage(error);
      setDialogError(message);
      onError(message);
    } finally {
      setIsFinalizing(false);
    }
  }, [canFinalize, feature, onCompleted, onError, onSuccess, rows]);

  return {
    canFinalize,
    closeCompletionDialog,
    completedCount,
    dialogError,
    dialogNotice,
    dialogOpen,
    finalizeCompletion,
    isCompleting,
    isFinalized,
    isFinalizing,
    isPreparing,
    issues,
    openCompletionDialog,
    payoutAll,
    rows,
    runPayoutForContribution,
    runningContributionId,
    totalCount,
  };
}
