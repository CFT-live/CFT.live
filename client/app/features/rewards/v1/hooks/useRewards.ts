"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppKitAccount } from "@reown/appkit/react";

export type UserReward = {
  id: string;
  wallet_address: string;
  reward_definition_id: string;
  contributor_id: string | null;
  token_amount: number;
  status: "PENDING" | "ALLOCATED" | "FAILED";
  action_context: Record<string, unknown> | null;
  error_message: string | null;
  created_date: string;
  allocated_date: string | null;
};

export type RewardDefinition = {
  id: string;
  name: string;
  description: string;
  action_type: "WALLET_CONNECT" | "PROFILE_COMPLETION" | "QUESTION_ANSWER" | "SOCIAL_SHARE";
  token_amount: number;
  status: "ACTIVE" | "INACTIVE";
};

export type RewardQuestion = {
  id: string;
  question_text: string;
  options: string[] | null;
  reward_definition_id: string;
  status: "ACTIVE" | "INACTIVE";
};

async function fetchMyRewards(): Promise<UserReward[]> {
  const res = await fetch("/api/rewards/my-rewards", { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json() as { rewards?: UserReward[] };
  return data.rewards ?? [];
}

async function fetchDefinitions(): Promise<RewardDefinition[]> {
  const res = await fetch("/api/rewards/definitions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filter: { status: "ACTIVE" } }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json() as { definitions?: RewardDefinition[] };
  return data.definitions ?? [];
}

async function fetchQuestions(): Promise<RewardQuestion[]> {
  const res = await fetch("/api/rewards/questions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filter: { status: "ACTIVE" } }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json() as { questions?: RewardQuestion[] };
  return data.questions ?? [];
}

export function useRewards() {
  const { isConnected } = useAppKitAccount();

  const myRewardsQuery = useQuery({
    queryKey: ["my-rewards"],
    queryFn: fetchMyRewards,
    enabled: isConnected,
  });

  const definitionsQuery = useQuery({
    queryKey: ["reward-definitions"],
    queryFn: fetchDefinitions,
  });

  const questionsQuery = useQuery({
    queryKey: ["reward-questions"],
    queryFn: fetchQuestions,
  });

  // Map of reward_definition_id -> UserReward for quick lookup
  const earnedByDefinitionId = new Map<string, UserReward>(
    (myRewardsQuery.data ?? []).map((r) => [r.reward_definition_id, r]),
  );

  const totalClaimable = (myRewardsQuery.data ?? [])
    .filter((r) => r.status === "ALLOCATED")
    .reduce((sum, r) => sum + r.token_amount, 0);

  return {
    myRewards: myRewardsQuery.data ?? [],
    definitions: definitionsQuery.data ?? [],
    questions: questionsQuery.data ?? [],
    earnedByDefinitionId,
    totalClaimable,
    isLoading: myRewardsQuery.isLoading || definitionsQuery.isLoading || questionsQuery.isLoading,
    refetch: () => {
      myRewardsQuery.refetch();
      definitionsQuery.refetch();
      questionsQuery.refetch();
    },
  };
}
