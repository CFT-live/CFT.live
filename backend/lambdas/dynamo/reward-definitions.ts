import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { RewardDefinition, RewardActionType, RewardDefinitionStatus } from "../types";
import { docClient, nowIso } from "./shared";

const TABLE = () => process.env.REWARD_DEFINITIONS_TABLE_NAME!;

export const getRewardDefinition = async (id: string): Promise<RewardDefinition | null> => {
  if (!id) return null;
  try {
    const data = await docClient.send(new GetCommand({ TableName: TABLE(), Key: { id } }));
    return (data.Item as RewardDefinition | undefined) ?? null;
  } catch (error) {
    console.error(`Error fetching reward definition: ${id}`, error);
    throw error;
  }
};

export const putRewardDefinition = async (def: RewardDefinition): Promise<RewardDefinition> => {
  try {
    await docClient.send(new PutCommand({ TableName: TABLE(), Item: def }));
    return def;
  } catch (error) {
    console.error(`Error saving reward definition: ${def.id}`, error);
    throw error;
  }
};

export const createRewardDefinition = async (input: {
  id: string;
  name: string;
  description: string;
  action_type: RewardActionType;
  token_amount: number;
  created_by_id: string;
}): Promise<RewardDefinition> => {
  const def: RewardDefinition = {
    ...input,
    status: "ACTIVE",
    created_date: nowIso(),
  };
  return putRewardDefinition(def);
};

export const updateRewardDefinition = async (
  id: string,
  updates: Partial<Pick<RewardDefinition, "name" | "description" | "token_amount" | "status">>,
): Promise<void> => {
  const sets: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  if (updates.name !== undefined) { sets.push("#n = :n"); names["#n"] = "name"; values[":n"] = updates.name; }
  if (updates.description !== undefined) { sets.push("description = :d"); values[":d"] = updates.description; }
  if (updates.token_amount !== undefined) { sets.push("token_amount = :ta"); values[":ta"] = updates.token_amount; }
  if (updates.status !== undefined) { sets.push("#s = :s"); names["#s"] = "status"; values[":s"] = updates.status; }

  if (sets.length === 0) return;

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE(),
        Key: { id },
        UpdateExpression: `SET ${sets.join(", ")}`,
        ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
        ExpressionAttributeValues: values,
        ConditionExpression: "attribute_exists(id)",
      }),
    );
  } catch (error) {
    console.error(`Error updating reward definition: ${id}`, error);
    throw error;
  }
};

export const listRewardDefinitions = async (filter?: {
  status?: RewardDefinitionStatus;
  action_type?: RewardActionType;
}): Promise<RewardDefinition[]> => {
  try {
    if (filter?.action_type) {
      const data = await docClient.send(
        new QueryCommand({
          TableName: TABLE(),
          IndexName: "action_type-index",
          KeyConditionExpression: "action_type = :at",
          ExpressionAttributeValues: { ":at": filter.action_type },
          ScanIndexForward: false,
        }),
      );
      return (data.Items ?? []) as RewardDefinition[];
    }
    if (filter?.status) {
      const data = await docClient.send(
        new QueryCommand({
          TableName: TABLE(),
          IndexName: "status-index",
          KeyConditionExpression: "#s = :s",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":s": filter.status },
          ScanIndexForward: false,
        }),
      );
      return (data.Items ?? []) as RewardDefinition[];
    }
    // Full scan when no filter (admin use — expected to be a small table)
    const { ScanCommand } = await import("@aws-sdk/lib-dynamodb");
    const data = await docClient.send(new ScanCommand({ TableName: TABLE() }));
    return (data.Items ?? []) as RewardDefinition[];
  } catch (error) {
    console.error("Error listing reward definitions", error);
    throw error;
  }
};

export const getActiveRewardDefinitionByActionType = async (
  actionType: RewardActionType,
): Promise<RewardDefinition | null> => {
  try {
    const data = await docClient.send(
      new QueryCommand({
        TableName: TABLE(),
        IndexName: "action_type-index",
        KeyConditionExpression: "action_type = :at",
        FilterExpression: "#s = :active",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":at": actionType, ":active": "ACTIVE" },
        Limit: 1,
        ScanIndexForward: false,
      }),
    );
    return (data.Items?.[0] as RewardDefinition | undefined) ?? null;
  } catch (error) {
    console.error(`Error fetching active reward definition for: ${actionType}`, error);
    throw error;
  }
};
