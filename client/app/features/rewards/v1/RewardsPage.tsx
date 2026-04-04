"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { TOKEN_FAUCET_ABI, TOKEN_FAUCET_ADDRESS } from "@/app/lib/contracts";
import { useRewards } from "./hooks/useRewards";
import { useClaimReward } from "./hooks/useClaimReward";
import QuestionCard from "./components/QuestionCard";
import RewardCard from "./components/RewardCard";

export default function RewardsPage() {
  const { isConnected, address } = useAppKitAccount();
  const { definitions, questions, myRewards, earnedByDefinitionId, isLoading, refetch } = useRewards();
  const { claim, isPending: isClaiming, isSuccess: claimSuccess, error: claimError } = useClaimReward();

  // Read claimable balance directly from the faucet contract
  const { data: claimableRaw } = useReadContract({
    address: TOKEN_FAUCET_ADDRESS,
    abi: TOKEN_FAUCET_ABI,
    functionName: "claimableAmount",
    args: [address as `0x${string}`],
    query: { enabled: isConnected && !!address, refetchInterval: 10_000 },
  });

  const claimableFormatted = claimableRaw !== undefined
    ? formatUnits(claimableRaw, 18)
    : "0";

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center p-8">
        <h1 className="text-2xl font-bold">Rewards</h1>
        <p className="text-muted-foreground">Connect your wallet to view and claim rewards.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Rewards</h1>
        <p className="text-muted-foreground text-sm">
          Complete actions to earn CFT tokens. Your earned tokens are claimable on Arbitrum.
        </p>
      </div>

      {/* Claimable balance + claim button */}
      <div className="rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Available to claim</p>
          <p className="text-3xl font-bold">
            {Number(claimableFormatted).toLocaleString(undefined, { maximumFractionDigits: 2 })} CFT
          </p>
        </div>
        <button
          disabled={!claimableRaw || claimableRaw === BigInt(0) || isClaiming}
          onClick={() => claim(Number(claimableFormatted))}
          className="rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {isClaiming ? "Claiming…" : "Claim Tokens"}
        </button>
      </div>

      {claimSuccess && (
        <p className="text-sm text-green-600 font-medium">Tokens claimed successfully!</p>
      )}
      {claimError && (
        <p className="text-sm text-destructive">{claimError}</p>
      )}

      {/* Available one-time rewards */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Available Rewards</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : definitions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rewards available right now.</p>
        ) : (
          <div className="grid gap-3">
            {definitions.map((def) => (
              <RewardCard
                key={def.id}
                definition={def}
                earnedReward={earnedByDefinitionId.get(def.id)}
                onRefetch={refetch}
              />
            ))}
          </div>
        )}
      </section>

      {/* Questions */}
      {questions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Answer & Earn</h2>
          <div className="grid gap-3">
            {questions.map((q) => {
              const def = definitions.find((d) => d.id === q.reward_definition_id);
              return (
                <QuestionCard
                  key={q.id}
                  question={q}
                  tokenAmount={def?.token_amount ?? 0}
                  alreadyAnswered={!!myRewards.find((r) => r.action_context?.question_id === q.id)}
                  onRefetch={refetch}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Earned rewards history */}
      {myRewards.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Your Reward History</h2>
          <div className="rounded-xl border divide-y text-sm">
            {myRewards.map((r) => (
              <div key={r.id} className="flex justify-between items-center px-4 py-3">
                <span className="text-muted-foreground capitalize">
                  {r.action_context?.question_id
                    ? "Question answer"
                    : r.reward_definition_id}
                </span>
                <span className="font-semibold">
                  +{r.token_amount} CFT
                  <span
                    className={`ml-2 text-xs font-normal ${
                      r.status === "ALLOCATED"
                        ? "text-green-600"
                        : r.status === "FAILED"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {r.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
