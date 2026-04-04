"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

type TriggerRewardResult =
  | { success: true; tokenAmount: number }
  | { success: false; alreadyClaimed: boolean; error: string };

export function useTriggerReward() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const trigger = useCallback(
    async (
      actionType: string,
      actionContext?: Record<string, unknown> | null,
    ): Promise<TriggerRewardResult> => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/rewards/trigger", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action_type: actionType, action_context: actionContext ?? null }),
        });

        if (res.status === 409) {
          return { success: false, alreadyClaimed: true, error: "Reward already claimed" };
        }

        if (!res.ok) {
          const text = await res.text();
          return { success: false, alreadyClaimed: false, error: text };
        }

        const data = await res.json() as { reward?: { token_amount?: number } };
        queryClient.invalidateQueries({ queryKey: ["my-rewards"] });

        return { success: true, tokenAmount: data.reward?.token_amount ?? 0 };
      } catch (err) {
        return { success: false, alreadyClaimed: false, error: String(err) };
      } finally {
        setIsLoading(false);
      }
    },
    [queryClient],
  );

  return { trigger, isLoading };
}
