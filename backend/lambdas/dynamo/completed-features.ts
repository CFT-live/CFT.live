import {
  GetCommand,
  GetCommandInput,
  GetCommandOutput,
  PutCommand,
  ScanCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import type { CompletedFeature, Feature } from "../types";
import { docClient, nowIso } from "./shared";

export const getCompletedFeature = async (
  id: string
): Promise<CompletedFeature | null> => {
  if (!id) return null;
  const params: GetCommandInput = {
    TableName: process.env.COMPLETED_FEATURES_TABLE_NAME!,
    Key: { id },
  };

  try {
    const data: GetCommandOutput = await docClient.send(new GetCommand(params));
    return (data.Item as CompletedFeature | undefined) ?? null;
  } catch (error) {
    console.error(`Error fetching completed feature for key: ${id}`, error);
    throw error;
  }
};

export const putCompletedFeature = async (
  feature: CompletedFeature
): Promise<CompletedFeature> => {
  const params = {
    TableName: process.env.COMPLETED_FEATURES_TABLE_NAME!,
    Item: feature,
  };

  try {
    await docClient.send(new PutCommand(params));
    return feature;
  } catch (error) {
    console.error(`Error saving completed feature for key: ${feature.id}`, error);
    throw error;
  }
};

export const listCompletedFeatures = async (filter?: {
  category?: string;
  created_by_id?: string;
  q?: string;
}): Promise<CompletedFeature[]> => {
  const TableName = process.env.COMPLETED_FEATURES_TABLE_NAME!;

  try {
    const resp = await docClient.send(new ScanCommand({ TableName }));
    const items = ((resp.Items ?? []) as CompletedFeature[])
      .slice()
      .sort((a, b) => (a.completed_date < b.completed_date ? 1 : -1));

    const q = (filter?.q ?? "").trim().toLowerCase();
    return items.filter((feature) => {
      if (filter?.category && feature.category !== filter.category) return false;
      if (filter?.created_by_id && feature.created_by_id !== filter.created_by_id) {
        return false;
      }
      if (q) {
        const haystack = `${feature.name} ${feature.description} ${feature.category}`
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  } catch (error) {
    console.error("Error listing completed features", error);
    throw error;
  }
};

export const completeFeature = async (input: {
  feature: Feature;
  completed_by_id: string;
}): Promise<CompletedFeature> => {
  const completedFeature: CompletedFeature = {
    ...input.feature,
    status: "COMPLETED",
    completed_by_id: input.completed_by_id,
    completed_date: nowIso(),
  };

  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: process.env.COMPLETED_FEATURES_TABLE_NAME!,
              Item: completedFeature,
              ConditionExpression: "attribute_not_exists(id)",
            },
          },
          {
            Delete: {
              TableName: process.env.FEATURES_TABLE_NAME!,
              Key: { id: input.feature.id },
              ConditionExpression: "attribute_exists(id)",
            },
          },
        ],
      })
    );

    return completedFeature;
  } catch (error) {
    console.error(`Error completing feature for key: ${input.feature.id}`, error);
    throw error;
  }
};