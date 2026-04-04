"use client";

import { useTriggerReward } from "../hooks/useTriggerReward";
import type { RewardDefinition, UserReward } from "../hooks/useRewards";

type Props = {
  definition: RewardDefinition;
  earnedReward: UserReward | undefined;
  onRefetch: () => void;
};

const ACTION_LABELS: Record<RewardDefinition["action_type"], string> = {
  WALLET_CONNECT: "Connect your wallet",
  PROFILE_COMPLETION: "Complete your contributor profile",
  QUESTION_ANSWER: "Answer a question",
  SOCIAL_SHARE: "Share on social media",
};

export default function RewardCard({ definition, earnedReward, onRefetch }: Props) {
  const { trigger, isLoading } = useTriggerReward();
  const isClaimed = !!earnedReward;

  const handleClaim = async () => {
    const result = await trigger(definition.action_type);
    if (result.success || result.alreadyClaimed) {
      onRefetch();
    }
  };

  return (
    <div className={`rounded-xl border p-4 flex items-start justify-between gap-4 ${isClaimed ? "opacity-60" : ""}`}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{definition.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{definition.description || ACTION_LABELS[definition.action_type]}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-sm font-bold">+{definition.token_amount} CFT</span>
        {isClaimed ? (
          <span className="text-xs text-green-600 font-medium">Claimed</span>
        ) : (
          <button
            onClick={handleClaim}
            disabled={isLoading || definition.action_type === "QUESTION_ANSWER" || definition.action_type === "SOCIAL_SHARE"}
            className="text-xs rounded-md px-3 py-1.5 bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            {isLoading ? "…" : "Claim"}
          </button>
        )}
      </div>
    </div>
  );
}
