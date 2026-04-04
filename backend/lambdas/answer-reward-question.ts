import { randomUUID } from "node:crypto";
import { getRewardQuestion } from "./dynamo/reward-questions";
import { getRewardDefinition } from "./dynamo/reward-definitions";
import {
  createUserRewardIfNotExists,
  updateUserRewardStatus,
} from "./dynamo/user-rewards";
import { addClaimAmountOnChain } from "./dynamo/faucet-contract";
import { getContributorByWalletAddress } from "./dynamo/contributors";
import { normalizeWalletAddress } from "./dynamo/shared";
import { validateAnswerRewardQuestionParams } from "./validateParams";

export const handler = async (event: any) => {
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const validation = validateAnswerRewardQuestionParams(params);
    if (!validation.success) {
      return { statusCode: 400, body: JSON.stringify({ error: validation.error.flatten().fieldErrors }) };
    }

    const { question_id, answer, wallet_address: rawWallet } = validation.data;
    const wallet_address = normalizeWalletAddress(rawWallet);

    const question = await getRewardQuestion(question_id);
    if (!question) {
      return { statusCode: 404, body: JSON.stringify({ error: "Question not found" }) };
    }
    if (question.status !== "ACTIVE") {
      return { statusCode: 400, body: JSON.stringify({ error: "Question is not active" }) };
    }

    const definition = await getRewardDefinition(question.reward_definition_id);
    if (!definition || definition.status !== "ACTIVE") {
      return { statusCode: 404, body: JSON.stringify({ error: "No active reward linked to this question" }) };
    }

    const contributor = await getContributorByWalletAddress(wallet_address);
    const rewardId = randomUUID();

    const userReward = await createUserRewardIfNotExists({
      id: rewardId,
      wallet_address,
      reward_definition_id: definition.id,
      contributor_id: contributor?.id ?? null,
      token_amount: definition.token_amount,
      status: "PENDING",
      action_context: { question_id, answer },
      error_message: null,
      created_date: new Date().toISOString(),
      allocated_date: null,
    });

    if (!userReward) {
      return { statusCode: 409, body: JSON.stringify({ error: "Reward already granted for this question" }) };
    }

    try {
      await addClaimAmountOnChain(wallet_address as `0x${string}`, definition.token_amount);
      await updateUserRewardStatus(rewardId, "ALLOCATED");
    } catch (contractError: any) {
      const msg = contractError?.message ?? "Contract call failed";
      console.error("Faucet contract call failed", contractError);
      await updateUserRewardStatus(rewardId, "FAILED", msg);
      return { statusCode: 500, body: JSON.stringify({ error: "Failed to allocate reward on-chain", detail: msg }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        reward: { id: rewardId, token_amount: definition.token_amount, status: "ALLOCATED" },
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
