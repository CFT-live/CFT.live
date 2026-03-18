import {
  GetCommand,
  GetCommandInput,
  GetCommandOutput,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import type { FeatureDistribution, TransactionStatus } from "../types";
import { getContributor, putContributor } from "./contributors";
import { docClient, nowIso } from "./shared";

export const getDistribution = async (
  distributionId: string
): Promise<FeatureDistribution | null> => {
  if (!distributionId) return null;

  const params: GetCommandInput = {
    TableName: process.env.FEATURE_DISTRIBUTION_TABLE_NAME!,
    Key: { id: distributionId },
  };

  try {
    const data: GetCommandOutput = await docClient.send(new GetCommand(params));
    const item = data.Item as FeatureDistribution | undefined;
    return item ?? null;
  } catch (error) {
    console.error(`Error fetching distribution for key: ${distributionId}`, error);
    throw error;
  }
};

export const putDistribution = async (
  distribution: FeatureDistribution
): Promise<FeatureDistribution> => {
  const params = {
    TableName: process.env.FEATURE_DISTRIBUTION_TABLE_NAME!,
    Item: distribution,
  };

  try {
    await docClient.send(new PutCommand(params));
    return distribution;
  } catch (error) {
    console.error(`Error saving distribution for key: ${distribution.id}`, error);
    throw error;
  }
};

export const upsertDistribution = async (input: {
  id: string;
  feature_id: string;
  task_id: string;
  contribution_id: string;
  payout_key: string;
  contributor_id: string;
  cp_amount: number;
  token_amount: number;
  token_amount_raw: string;
  arbitrum_tx_hash: string | null;
  approver_id: string;
  transaction_status: TransactionStatus;
}): Promise<FeatureDistribution> => {
  const existing = await getDistribution(input.id);
  const prevStatus = existing?.transaction_status;
  const distribution_date = existing?.distribution_date ?? nowIso();

  const distribution: FeatureDistribution = {
    id: input.id,
    feature_id: input.feature_id,
    task_id: input.task_id,
    contribution_id: input.contribution_id,
    payout_key: input.payout_key,
    contributor_id: input.contributor_id,
    cp_amount: input.cp_amount,
    token_amount: input.token_amount,
    token_amount_raw: input.token_amount_raw,
    arbitrum_tx_hash: input.arbitrum_tx_hash,
    distribution_date,
    approver_id: input.approver_id,
    transaction_status: input.transaction_status,
  };

  const saved = await putDistribution(distribution);

  if (input.transaction_status === "Confirmed" && prevStatus !== "Confirmed") {
    const contributor = await getContributor(input.contributor_id);
    if (contributor) {
      await putContributor({
        ...contributor,
        total_tokens_earned: contributor.total_tokens_earned + input.token_amount,
        last_active_date: nowIso(),
      });
    }
  }

  return saved;
};

export const patchDistributionTx = async (input: {
  id: string;
  transaction_status: TransactionStatus;
  arbitrum_tx_hash: string | null;
  approver_id: string;
}): Promise<FeatureDistribution> => {
  const existing = await getDistribution(input.id);
  if (!existing) {
    throw new Error("Distribution not found");
  }

  const prevStatus = existing.transaction_status;

  const updated: FeatureDistribution = {
    ...existing,
    transaction_status: input.transaction_status,
    arbitrum_tx_hash: input.arbitrum_tx_hash,
    approver_id: input.approver_id,
  };

  const saved = await putDistribution(updated);

  if (updated.transaction_status === "Confirmed" && prevStatus !== "Confirmed") {
    const contributor = await getContributor(existing.contributor_id);
    if (contributor) {
      await putContributor({
        ...contributor,
        total_tokens_earned: contributor.total_tokens_earned + existing.token_amount,
        last_active_date: nowIso(),
      });
    }
  }

  return saved;
};

export const listDistributions = async (filter?: {
  feature_id?: string;
  task_id?: string;
  contribution_id?: string;
  contributor_id?: string;
  payout_key?: string;
  transaction_status?: TransactionStatus;
}): Promise<FeatureDistribution[]> => {
  const TableName = process.env.FEATURE_DISTRIBUTION_TABLE_NAME!;
  try {
    let items: FeatureDistribution[] = [];
    if (filter?.feature_id) {
      const resp = await docClient.send(
        new QueryCommand({
          TableName,
          IndexName: "feature_id-index",
          KeyConditionExpression: "feature_id = :fid",
          ExpressionAttributeValues: { ":fid": filter.feature_id },
        })
      );
      items = (resp.Items ?? []) as FeatureDistribution[];
    } else if (filter?.contribution_id) {
      const resp = await docClient.send(
        new QueryCommand({
          TableName,
          IndexName: "contribution_id-index",
          KeyConditionExpression: "contribution_id = :cid",
          ExpressionAttributeValues: { ":cid": filter.contribution_id },
        })
      );
      items = (resp.Items ?? []) as FeatureDistribution[];
    } else if (filter?.payout_key) {
      const resp = await docClient.send(
        new QueryCommand({
          TableName,
          IndexName: "payout_key-index",
          KeyConditionExpression: "payout_key = :pk",
          ExpressionAttributeValues: { ":pk": filter.payout_key },
        })
      );
      items = (resp.Items ?? []) as FeatureDistribution[];
    } else if (filter?.task_id) {
      const resp = await docClient.send(
        new QueryCommand({
          TableName,
          IndexName: "task_id-index",
          KeyConditionExpression: "task_id = :tid",
          ExpressionAttributeValues: { ":tid": filter.task_id },
        })
      );
      items = (resp.Items ?? []) as FeatureDistribution[];
    } else if (filter?.contributor_id) {
      const resp = await docClient.send(
        new QueryCommand({
          TableName,
          IndexName: "contributor_id-index",
          KeyConditionExpression: "contributor_id = :cid",
          ExpressionAttributeValues: { ":cid": filter.contributor_id },
        })
      );
      items = (resp.Items ?? []) as FeatureDistribution[];
    } else if (filter?.transaction_status) {
      const resp = await docClient.send(
        new QueryCommand({
          TableName,
          IndexName: "transaction_status-index",
          KeyConditionExpression: "transaction_status = :ts",
          ExpressionAttributeValues: { ":ts": filter.transaction_status },
        })
      );
      items = (resp.Items ?? []) as FeatureDistribution[];
    } else {
      const resp = await docClient.send(new ScanCommand({ TableName }));
      items = (resp.Items ?? []) as FeatureDistribution[];
    }

    if (filter?.feature_id) {
      items = items.filter((distribution) => distribution.feature_id === filter.feature_id);
    }
    if (filter?.task_id) {
      items = items.filter((distribution) => distribution.task_id === filter.task_id);
    }
    if (filter?.contribution_id) {
      items = items.filter(
        (distribution) => distribution.contribution_id === filter.contribution_id
      );
    }
    if (filter?.contributor_id) {
      items = items.filter(
        (distribution) => distribution.contributor_id === filter.contributor_id
      );
    }
    if (filter?.payout_key) {
      items = items.filter((distribution) => distribution.payout_key === filter.payout_key);
    }
    if (filter?.transaction_status) {
      items = items.filter(
        (distribution) => distribution.transaction_status === filter.transaction_status
      );
    }
    return items;
  } catch (error) {
    console.error("Error listing distributions", error);
    throw error;
  }
};