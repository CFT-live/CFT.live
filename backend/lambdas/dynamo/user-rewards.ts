import {
  ConditionalCheckFailedException,
} from "@aws-sdk/client-dynamodb";
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { UserReward, UserRewardStatus } from "../types";
import { docClient, nowIso, normalizeWalletAddress } from "./shared";

const TABLE = () => process.env.USER_REWARDS_TABLE_NAME!;

export const getUserReward = async (id: string): Promise<UserReward | null> => {
  if (!id) return null;
  try {
    const data = await docClient.send(new GetCommand({ TableName: TABLE(), Key: { id } }));
    return (data.Item as UserReward | undefined) ?? null;
  } catch (error) {
    console.error(`Error fetching user reward: ${id}`, error);
    throw error;
  }
};

/**
 * Atomically create a UserReward only if one does not already exist for this
 * wallet+reward_definition combination. Returns the created record, or null if
 * the reward has already been granted (idempotent one-time enforcement).
 */
export const createUserRewardIfNotExists = async (
  reward: UserReward,
): Promise<UserReward | null> => {
  const normalizedWallet = normalizeWalletAddress(reward.wallet_address);
  const item: UserReward = { ...reward, wallet_address: normalizedWallet };

  // First check via GSI whether this wallet+rewardDef combo already exists
  const existing = await getUserRewardByWalletAndDef(
    normalizedWallet,
    reward.reward_definition_id,
  );
  if (existing) return null;

  // Use PutCommand with ConditionExpression to prevent race conditions
  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE(),
        Item: item,
        ConditionExpression: "attribute_not_exists(id)",
      }),
    );
    return item;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return null; // Another concurrent request already wrote it
    }
    console.error("Error creating user reward", error);
    throw error;
  }
};

export const getUserRewardByWalletAndDef = async (
  walletAddress: string,
  rewardDefinitionId: string,
): Promise<UserReward | null> => {
  const normalized = normalizeWalletAddress(walletAddress);
  try {
    const data = await docClient.send(
      new QueryCommand({
        TableName: TABLE(),
        IndexName: "wallet_address-reward_def-index",
        KeyConditionExpression:
          "wallet_address = :w AND reward_definition_id = :r",
        ExpressionAttributeValues: {
          ":w": normalized,
          ":r": rewardDefinitionId,
        },
        Limit: 1,
      }),
    );
    return (data.Items?.[0] as UserReward | undefined) ?? null;
  } catch (error) {
    console.error("Error querying user reward by wallet+def", error);
    throw error;
  }
};

export const updateUserRewardStatus = async (
  id: string,
  status: UserRewardStatus,
  errorMessage?: string,
): Promise<void> => {
  const allocatedDate = status === "ALLOCATED" ? nowIso() : undefined;
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE(),
        Key: { id },
        UpdateExpression:
          "SET #s = :s" +
          (allocatedDate ? ", allocated_date = :ad" : "") +
          (errorMessage !== undefined ? ", error_message = :em" : ""),
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: {
          ":s": status,
          ...(allocatedDate ? { ":ad": allocatedDate } : {}),
          ...(errorMessage !== undefined ? { ":em": errorMessage } : {}),
        },
      }),
    );
  } catch (error) {
    console.error(`Error updating user reward status: ${id}`, error);
    throw error;
  }
};

export const listUserRewardsByWallet = async (
  walletAddress: string,
): Promise<UserReward[]> => {
  const normalized = normalizeWalletAddress(walletAddress);
  try {
    const data = await docClient.send(
      new QueryCommand({
        TableName: TABLE(),
        IndexName: "wallet_address-reward_def-index",
        KeyConditionExpression: "wallet_address = :w",
        ExpressionAttributeValues: { ":w": normalized },
      }),
    );
    return (data.Items ?? []) as UserReward[];
  } catch (error) {
    console.error("Error listing user rewards by wallet", error);
    throw error;
  }
};
