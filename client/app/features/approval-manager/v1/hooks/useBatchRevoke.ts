"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { writeContract, waitForTransactionReceipt } from "@wagmi/core";
import { useAppKitAccount } from "@reown/appkit/react";
import { config } from "@/app/config";
import { erc20Abi } from "@/app/lib/contracts";
import { useWalletConfirmation } from "@/app/providers/WalletConfirmationProvider";
import type { TokenApproval, BatchRevokeItem, BatchRevokeStatus } from "../types";

function shortenError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("User rejected") || msg.includes("User denied")) {
    return "Cancelled in wallet";
  }
  return msg.split("\n")[0].slice(0, 100);
}

function updateItemAtIndex(
  items: BatchRevokeItem[],
  index: number,
  patch: Partial<BatchRevokeItem>,
): BatchRevokeItem[] {
  return items.map((item, i) => (i === index ? { ...item, ...patch } : item));
}

export function useBatchRevoke(onComplete?: () => void) {
  const queryClient = useQueryClient();
  const { address } = useAppKitAccount();
  const { beginWalletConfirmation, endWalletConfirmation } = useWalletConfirmation();

  const [items, setItems] = useState<BatchRevokeItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const start = useCallback(
    async (approvals: TokenApproval[]) => {
      if (!address) return;

      const initial: BatchRevokeItem[] = approvals.map((approval) => ({
        approval,
        status: "pending" as BatchRevokeStatus,
      }));
      setItems(initial);
      setDialogOpen(true);
      setIsRunning(true);

      for (let i = 0; i < approvals.length; i++) {
        const approval = approvals[i];
        setItems((prev) => updateItemAtIndex(prev, i, { status: "confirming" }));

        const confId = beginWalletConfirmation(
          `Revoking ${approval.tokenSymbol} (${i + 1}/${approvals.length})…`,
        );

        try {
          const hash = await writeContract(config, {
            address: approval.tokenAddress,
            abi: erc20Abi,
            functionName: "approve",
            args: [approval.spenderAddress, BigInt(0)],
            account: address as `0x${string}`,
          });

          endWalletConfirmation(confId);
          await waitForTransactionReceipt(config, { hash });

          setItems((prev) =>
            updateItemAtIndex(prev, i, { status: "confirmed", txHash: hash }),
          );
        } catch (err) {
          endWalletConfirmation(confId);
          setItems((prev) =>
            updateItemAtIndex(prev, i, {
              status: "failed",
              errorMessage: shortenError(err),
            }),
          );
        }
      }

      setIsRunning(false);
      queryClient.invalidateQueries({ queryKey: ["approvalLogs"] });
      onComplete?.();
    },
    [address, beginWalletConfirmation, endWalletConfirmation, queryClient, onComplete],
  );

  return { start, items, isRunning, dialogOpen, setDialogOpen };
}
