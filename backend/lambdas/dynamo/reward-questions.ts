import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { RewardQuestion, RewardQuestionStatus } from "../types";
import { docClient, nowIso } from "./shared";

const TABLE = () => process.env.REWARD_QUESTIONS_TABLE_NAME!;

export const getRewardQuestion = async (id: string): Promise<RewardQuestion | null> => {
  if (!id) return null;
  try {
    const data = await docClient.send(new GetCommand({ TableName: TABLE(), Key: { id } }));
    return (data.Item as RewardQuestion | undefined) ?? null;
  } catch (error) {
    console.error(`Error fetching reward question: ${id}`, error);
    throw error;
  }
};

export const putRewardQuestion = async (question: RewardQuestion): Promise<RewardQuestion> => {
  try {
    await docClient.send(new PutCommand({ TableName: TABLE(), Item: question }));
    return question;
  } catch (error) {
    console.error(`Error saving reward question: ${question.id}`, error);
    throw error;
  }
};

export const createRewardQuestion = async (input: {
  id: string;
  question_text: string;
  options: string[] | null;
  reward_definition_id: string;
  created_by_id: string;
}): Promise<RewardQuestion> => {
  const question: RewardQuestion = {
    ...input,
    status: "ACTIVE",
    created_date: nowIso(),
  };
  return putRewardQuestion(question);
};

export const updateRewardQuestion = async (
  id: string,
  updates: Partial<Pick<RewardQuestion, "question_text" | "options" | "status">>,
): Promise<void> => {
  const sets: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  if (updates.question_text !== undefined) { sets.push("question_text = :qt"); values[":qt"] = updates.question_text; }
  if (updates.options !== undefined) { sets.push("options = :o"); values[":o"] = updates.options; }
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
    console.error(`Error updating reward question: ${id}`, error);
    throw error;
  }
};

export const listRewardQuestions = async (filter?: {
  status?: RewardQuestionStatus;
  reward_definition_id?: string;
}): Promise<RewardQuestion[]> => {
  try {
    if (filter?.reward_definition_id) {
      const data = await docClient.send(
        new QueryCommand({
          TableName: TABLE(),
          IndexName: "reward_definition_id-index",
          KeyConditionExpression: "reward_definition_id = :rd",
          ExpressionAttributeValues: { ":rd": filter.reward_definition_id },
          ScanIndexForward: false,
        }),
      );
      return (data.Items ?? []) as RewardQuestion[];
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
      return (data.Items ?? []) as RewardQuestion[];
    }
    const { ScanCommand } = await import("@aws-sdk/lib-dynamodb");
    const data = await docClient.send(new ScanCommand({ TableName: TABLE() }));
    return (data.Items ?? []) as RewardQuestion[];
  } catch (error) {
    console.error("Error listing reward questions", error);
    throw error;
  }
};
