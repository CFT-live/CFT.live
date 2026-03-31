import { randomUUID } from "node:crypto";
import { getActiveRewardDefinitionByActionType } from "./dynamo/reward-definitions";
import {
  createUserRewardIfNotExists,
  updateUserRewardStatus,
} from "./dynamo/user-rewards";
import { addClaimAmountOnChain } from "./dynamo/faucet-contract";
import { getContributorByWalletAddress } from "./dynamo/contributors";
import type { RewardActionType } from "./types";
import { normalizeWalletAddress } from "./dynamo/shared";
import { validateTriggerRewardParams } from "./validateParams";

/**
 * POST /rewards/trigger
 *
 * Grants a one-time reward to a user for completing a specific action.
 * Security model:
 *   - wallet_address is always sourced from the verified SIWE session header
 *     set by the Next.js route handler — clients cannot forge it.
 *   - token_amount comes from the RewardDefinition in the database.
 *   - DynamoDB conditional write prevents double-grants even under concurrent requests.
 */
export const handler = async (event: any) => {
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const validation = validateTriggerRewardParams(params);
    if (!validation.success) {
      return { statusCode: 400, body: JSON.stringify({ error: validation.error.flatten().fieldErrors }) };
    }

    const { wallet_address: rawWallet, action_type, action_context } = validation.data;
    const wallet_address = normalizeWalletAddress(rawWallet);

    // Look up the active reward definition for this action type
    const definition = await getActiveRewardDefinitionByActionType(action_type as RewardActionType);
    if (!definition) {
      return { statusCode: 404, body: JSON.stringify({ error: "No active reward for this action type" }) };
    }

    // Verify the action actually occurred for business-logic–gated rewards
    const verificationError = await verifyAction(action_type as RewardActionType, wallet_address, action_context);
    if (verificationError) {
      return { statusCode: 400, body: JSON.stringify({ error: verificationError }) };
    }

    // Look up contributor id if possible (optional — wallet may not have a full profile yet)
    const contributor = await getContributorByWalletAddress(wallet_address);

    // Atomic one-time check-and-write — returns null if already rewarded
    const rewardId = randomUUID();
    const userReward = await createUserRewardIfNotExists({
      id: rewardId,
      wallet_address,
      reward_definition_id: definition.id,
      contributor_id: contributor?.id ?? null,
      token_amount: definition.token_amount,
      status: "PENDING",
      action_context: action_context ?? null,
      error_message: null,
      created_date: new Date().toISOString(),
      allocated_date: null,
    });

    if (!userReward) {
      return { statusCode: 409, body: JSON.stringify({ error: "Reward already granted for this action" }) };
    }

    // Call the faucet contract — update status to ALLOCATED or FAILED
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
        reward: {
          id: rewardId,
          token_amount: definition.token_amount,
          status: "ALLOCATED",
        },
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};

/**
 * Business-logic verifications per action type.
 * Returns an error string if the action cannot be verified, or null if it passes.
 */
async function verifyAction(
  actionType: RewardActionType,
  walletAddress: string,
  actionContext: Record<string, unknown> | null,
): Promise<string | null> {
  switch (actionType) {
    case "WALLET_CONNECT":
      // Wallet connect is verified implicitly — if the request reached here with a
      // valid wallet_address from the SIWE session, the wallet is connected.
      return null;

    case "PROFILE_COMPLETION": {
      const contributor = await getContributorByWalletAddress(walletAddress);
      if (!contributor) return "Contributor profile not found";
      if (!contributor.bio || !contributor.profile_image_url) {
        return "Profile must have a bio and profile image to claim this reward";
      }
      return null;
    }

    case "QUESTION_ANSWER": {
      // Called by answer-reward-question Lambda; question_id and answer are required
      if (!actionContext?.question_id || !actionContext?.answer) {
        return "question_id and answer required in action_context for QUESTION_ANSWER reward";
      }
      return null;
    }

    case "SOCIAL_SHARE": {
      // Minimal: require a share_url in action_context (full off-chain verification
      // can be added later via a platform API integration)
      if (!actionContext?.share_url) {
        return "share_url required in action_context for SOCIAL_SHARE reward";
      }
      return null;
    }

    default:
      return `Unknown action type: ${actionType}`;
  }
}
