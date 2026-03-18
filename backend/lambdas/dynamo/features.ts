import {
  DeleteCommand,
  GetCommand,
  GetCommandInput,
  GetCommandOutput,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Feature, FeatureStatus } from "../types";
import { docClient, nowIso } from "./shared";

export const getFeature = async (id: string): Promise<Feature | null> => {
  if (!id) return null;
  const params: GetCommandInput = {
    TableName: process.env.FEATURES_TABLE_NAME!,
    Key: { id },
  };

  try {
    const data: GetCommandOutput = await docClient.send(new GetCommand(params));
    return (data.Item as Feature | undefined) ?? null;
  } catch (error) {
    console.error(`Error fetching feature for key: ${id}`, error);
    throw error;
  }
};

export const putFeature = async (feature: Feature): Promise<Feature> => {
  const params = {
    TableName: process.env.FEATURES_TABLE_NAME!,
    Item: feature,
  };
  try {
    await docClient.send(new PutCommand(params));
    return feature;
  } catch (error) {
    console.error(`Error saving feature for key: ${feature.id}`, error);
    throw error;
  }
};

export const upsertFeature = async (input: {
  id: string;
  name: string;
  description: string;
  category: string;
  total_tokens_reward: number;
  status: FeatureStatus;
  created_by_id: string;
  discussions_url?: string | null;
}): Promise<Feature> => {
  const existing = await getFeature(input.id);
  const created_date = existing?.created_date ?? nowIso();

  const feature: Feature = {
    id: input.id,
    name: input.name,
    description: input.description,
    category: input.category,
    total_tokens_reward: input.total_tokens_reward,
    status: input.status,
    created_by_id: existing?.created_by_id ?? input.created_by_id,
    created_date,
    discussions_url: input.discussions_url ?? null,
  };

  return putFeature(feature);
};

export const listFeatures = async (filter?: {
  status?: FeatureStatus;
  category?: string;
  created_by_id?: string;
  q?: string;
}): Promise<Feature[]> => {
  const TableName = process.env.FEATURES_TABLE_NAME!;
  try {
    let items: Feature[] = [];
    if (filter?.category) {
      const resp = await docClient.send(
        new QueryCommand({
          TableName,
          IndexName: "category-index",
          KeyConditionExpression: "category = :category",
          ExpressionAttributeValues: { ":category": filter.category },
        })
      );
      items = (resp.Items ?? []) as Feature[];
    } else if (filter?.created_by_id) {
      const resp = await docClient.send(
        new QueryCommand({
          TableName,
          IndexName: "created_by_id-index",
          KeyConditionExpression: "created_by_id = :cid",
          ExpressionAttributeValues: { ":cid": filter.created_by_id },
        })
      );
      items = (resp.Items ?? []) as Feature[];
    } else if (filter?.status) {
      const resp = await docClient.send(
        new QueryCommand({
          TableName,
          IndexName: "status-index",
          KeyConditionExpression: "#status = :status",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":status": filter.status },
        })
      );
      items = (resp.Items ?? []) as Feature[];
    } else {
      const resp = await docClient.send(new ScanCommand({ TableName }));
      items = (resp.Items ?? []) as Feature[];
    }

    const q = (filter?.q ?? "").trim().toLowerCase();
    return items.filter((feature) => {
      if (filter?.status && feature.status !== filter.status) return false;
      if (q) {
        const haystack = `${feature.name} ${feature.description} ${feature.category}`
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  } catch (error) {
    console.error("Error listing features", error);
    throw error;
  }
};

export const deleteFeature = async (id: string): Promise<Feature | null> => {
  if (!id) return null;
  const params = {
    TableName: process.env.FEATURES_TABLE_NAME!,
    Key: { id },
    ReturnValues: "ALL_OLD" as const,
  };
  try {
    const data = await docClient.send(new DeleteCommand(params));
    return (data.Attributes as Feature | undefined) ?? null;
  } catch (error) {
    console.error(`Error deleting feature for key: ${id}`, error);
    throw error;
  }
};