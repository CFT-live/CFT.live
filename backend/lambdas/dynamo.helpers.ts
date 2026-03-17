import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  GetCommandInput,
  GetCommandOutput,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  Contributor,
  Contribution,
  TeamRole,
  Feature,
  CompletedFeature,
  FeatureDistribution,
  Task,
  ContributorStatus,
  ContributionStatus,
  FeatureStatus,
  TaskStatus,
  TaskType,
  TransactionStatus,
} from "./types";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

const nowIso = (): string => new Date().toISOString();

const normalizeWalletAddress = (walletAddress: string): string =>
  (walletAddress ?? "").trim().toLowerCase();

const normalizeTeamRoles = (record: any): TeamRole[] => {
  const roles = record?.roles;
  if (Array.isArray(roles)) {
    return Array.from(new Set(roles)).filter(Boolean);
  }
  return [];
};

const normalizeContributorRecord = (record: any): Contributor => {
  return {
    ...(record as Contributor),
    roles: normalizeTeamRoles(record),
  };
};

const touchContributorLastActive = async (contributorId: string): Promise<void> => {
  try {
    const contributor = await getContributor(contributorId);
    if (!contributor) return;
    await putContributor({
      ...contributor,
      last_active_date: nowIso(),
    });
  } catch (err) {
    // Best-effort only
    console.warn("Failed to touch contributor last_active_date", err);
  }
};

const normalizeTaskRecord = (record: any): Task => {
  const base = record ?? {};
  return {
    ...(base as Task),
    claimed_by_id: base.claimed_by_id ?? null,
    claimed_date: base.claimed_date ?? null,
  };
};

const toTaskPutItem = (task: Task): Record<string, unknown> => {
  const item: Record<string, unknown> = { ...(task as unknown as Record<string, unknown>) };

  // Tasks table has a GSI on claimed_by_id/claimed_date. DynamoDB does not allow
  // NULL values for index keys; omit attributes entirely when unclaimed.
  if (item.claimed_by_id == null) delete item.claimed_by_id;
  if (item.claimed_date == null) delete item.claimed_date;

  return item;
};

// Tasks

export const getTask = async (taskId: string): Promise<Task | null> => {
  if (!taskId) return null;

  const params: GetCommandInput = {
    TableName: process.env.TASKS_TABLE_NAME!,
    Key: { id: taskId },
  };

  try {
    const data: GetCommandOutput = await docClient.send(new GetCommand(params));
    const item = data.Item as Task | undefined;
    return item ? normalizeTaskRecord(item) : null;
  } catch (error) {
    console.error(`Error fetching task for key: ${taskId}`, error);
    throw error;
  }
};

export const putTask = async (task: Task): Promise<Task> => {
  const params = {
    TableName: process.env.TASKS_TABLE_NAME!,
    Item: toTaskPutItem(task),
  };

  try {
    await docClient.send(new PutCommand(params));
    return task;
  } catch (error) {
    console.error(`Error saving task for key: ${task.id}`, error);
    throw error;
  }
};

export const upsertTask = async (input: {
  id: string;
  feature_id: string;
  name: string;
  description: string;
  task_type: TaskType;
  acceptance_criteria: string;
  status: TaskStatus;
  claimed_by_id: string | null;
  claimed_date: string | null;
  created_by_id: string;
}): Promise<Task> => {
  const existing = await getTask(input.id);
  const created_date = existing?.created_date ?? nowIso();

  const task: Task = {
    id: input.id,
    feature_id: input.feature_id,
    name: input.name,
    description: input.description,
    task_type: input.task_type,
    acceptance_criteria: input.acceptance_criteria,
    status: input.status,
    claimed_by_id: input.claimed_by_id,
    claimed_date: input.claimed_date,
    created_by_id: existing?.created_by_id ?? input.created_by_id,
    created_date,
  };

  return putTask(task);
};

export const listTasks = async (filter?: {
  status?: TaskStatus;
  task_type?: TaskType;
  feature_id?: string;
  q?: string;
}): Promise<Task[]> => {
  try {
    const TableName = process.env.TASKS_TABLE_NAME!;

    // Prefer querying an index when possible
    if (filter?.feature_id) {
      const resp = await docClient.send(
        new QueryCommand({
          TableName,
          IndexName: "feature_id-index",
          KeyConditionExpression: "feature_id = :fid",
          ExpressionAttributeValues: { ":fid": filter.feature_id },
        })
      );
      let items = (resp.Items ?? []).map(normalizeTaskRecord) as Task[];
      items = applyTaskFilters(items, filter);
      return items;
    }

    if (filter?.status) {
      const resp = await docClient.send(
        new QueryCommand({
          TableName,
          IndexName: "status-index",
          KeyConditionExpression: "#status = :status",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":status": filter.status },
        })
      );
      let items = (resp.Items ?? []).map(normalizeTaskRecord) as Task[];
      items = applyTaskFilters(items, filter);
      return items;
    }

    const scan = await docClient.send(new ScanCommand({ TableName }));
    let items = (scan.Items ?? []).map(normalizeTaskRecord) as Task[];
    items = applyTaskFilters(items, filter);
    return items;
  } catch (error) {
    console.error("Error listing tasks", error);
    throw error;
  }
};

const applyTaskFilters = (
  items: Task[],
  filter?: { task_type?: TaskType; q?: string }
): Task[] => {
  if (!filter) return items;
  const q = (filter.q ?? "").trim().toLowerCase();
  return items.filter((t) => {
    if (filter.task_type && t.task_type !== filter.task_type) return false;
    if (q) {
      const hay = `${t.name} ${t.description} ${t.acceptance_criteria}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
};

export const deleteTask = async (taskId: string): Promise<Task | null> => {
  if (!taskId) return null;

  const params = {
    TableName: process.env.TASKS_TABLE_NAME!,
    Key: { id: taskId },
    ReturnValues: "ALL_OLD" as const,
  };

  try {
    const data = await docClient.send(new DeleteCommand(params));
    return (data.Attributes as Task | undefined) ?? null;
  } catch (error) {
    console.error(`Error deleting task for key: ${taskId}`, error);
    throw error;
  }
};

// Contributors

export const getContributor = async (id: string): Promise<Contributor | null> => {
  if (!id) return null;

  const params: GetCommandInput = {
    TableName: process.env.CONTRIBUTORS_TABLE_NAME!,
    Key: { id },
  };

  try {
    const data: GetCommandOutput = await docClient.send(new GetCommand(params));
    const item = data.Item as any;
    return item ? normalizeContributorRecord(item) : null;
  } catch (error) {
    console.error(`Error fetching contributor for key: ${id}`, error);
    throw error;
  }
};

export const getContributorByWalletAddress = async (
  walletAddress: string
): Promise<Contributor | null> => {
  const wallet_address = normalizeWalletAddress(walletAddress);
  if (!wallet_address) return null;

  const TableName = process.env.CONTRIBUTORS_TABLE_NAME!;
  try {
    const resp = await docClient.send(
      new QueryCommand({
        TableName,
        IndexName: "wallet_address-index",
        KeyConditionExpression: "wallet_address = :wa",
        ExpressionAttributeValues: {
          ":wa": wallet_address,
        },
        Limit: 1,
      })
    );

    const item = (resp.Items ?? [])[0] as any;
    return item ? normalizeContributorRecord(item) : null;
  } catch (error) {
    console.error(
      `Error fetching contributor for wallet_address: ${wallet_address}`,
      error
    );
    throw error;
  }
};

export const putContributor = async (contributor: Contributor): Promise<Contributor> => {
  const params = {
    TableName: process.env.CONTRIBUTORS_TABLE_NAME!,
    Item: contributor,
  };

  try {
    await docClient.send(new PutCommand(params));
    return contributor;
  } catch (error) {
    console.error(`Error saving contributor for key: ${contributor.id}`, error);
    throw error;
  }
};

export const listContributors = async (filter?: {
  status?: ContributorStatus;
  roles?: TeamRole[];
  q?: string;
}): Promise<Contributor[]> => {
  const TableName = process.env.CONTRIBUTORS_TABLE_NAME!;
  try {
    let items: any[] = [];
    if (filter?.status) {
      const resp = await docClient.send(
        new QueryCommand({
          TableName,
          IndexName: "status-index",
          KeyConditionExpression: "#status = :status",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":status": filter.status },
        })
      );
      items = resp.Items ?? [];
    } else {
      const resp = await docClient.send(new ScanCommand({ TableName }));
      items = resp.Items ?? [];
    }

    const normalized = items.map(normalizeContributorRecord);
    const q = (filter?.q ?? "").trim().toLowerCase();

    return normalized.filter((c) => {
      if (filter?.roles?.length) {
        const allowed = new Set(filter.roles);
        if (!c.roles.some((r) => allowed.has(r))) return false;
      }

      if (q) {
        const hay = `${c.username} ${c.wallet_address} ${c.github_username ?? ""} ${c.telegram_handle ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  } catch (error) {
    console.error("Error listing contributors", error);
    throw error;
  }
};

export const upsertContributor = async (input: {
  wallet_address: string;
  username: string;
  email: string | null;
  github_username: string | null;
  telegram_handle: string | null;
  bio: string | null;
  profile_image_url: string | null;
  roles?: TeamRole[];
  status?: ContributorStatus;
}): Promise<Contributor> => {
  const wallet_address = normalizeWalletAddress(input.wallet_address);
  if (!wallet_address) {
    throw new Error("wallet_address is required");
  }

  // Enforce wallet uniqueness (even if we later decouple id from wallet address).
  const existingByWallet = await getContributorByWalletAddress(wallet_address);
  const id = existingByWallet?.id ?? wallet_address;
  const existing = existingByWallet ?? (await getContributor(id));
  const now = nowIso();

  const contributor: Contributor = {
    id,
    wallet_address,
    username: input.username,
    email: input.email,
    github_username: input.github_username,
    telegram_handle: input.telegram_handle,
    bio: input.bio,
    profile_image_url: input.profile_image_url,
    roles: Array.from(
      new Set(input.roles ?? existing?.roles ?? [])
    ),
    total_tokens_earned: existing?.total_tokens_earned ?? 0,
    total_features_contributed: existing?.total_features_contributed ?? 0,
    total_tasks_completed: existing?.total_tasks_completed ?? 0,
    created_date: existing?.created_date ?? now,
    last_active_date: now,
    status: input.status ?? existing?.status ?? "ACTIVE",
  };

  return putContributor(contributor);
};

// Features

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
    return items.filter((f) => {
      if (filter?.status && f.status !== filter.status) return false;
      if (q) {
        const hay = `${f.name} ${f.description} ${f.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
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

// Completed Features

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
        const haystack = `${feature.name} ${feature.description} ${feature.category}`.toLowerCase();
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

// Contributions

export const getContribution = async (id: string): Promise<Contribution | null> => {
  if (!id) return null;
  const params: GetCommandInput = {
    TableName: process.env.CONTRIBUTIONS_TABLE_NAME!,
    Key: { id },
  };
  try {
    const data: GetCommandOutput = await docClient.send(new GetCommand(params));
    return (data.Item as Contribution | undefined) ?? null;
  } catch (error) {
    console.error(`Error fetching contribution for key: ${id}`, error);
    throw error;
  }
};

export const putContribution = async (
  contribution: Contribution
): Promise<Contribution> => {
  const params = {
    TableName: process.env.CONTRIBUTIONS_TABLE_NAME!,
    Item: contribution,
  };
  try {
    await docClient.send(new PutCommand(params));
    return contribution;
  } catch (error) {
    console.error(`Error saving contribution for key: ${contribution.id}`, error);
    throw error;
  }
};

export const createContribution = async (input: {
  id: string;
  task_id: string;
  contributor_id: string;
  submitted_work_url: string;
  submission_notes: string | null;
  github_pr_number: number | null;
}): Promise<Contribution> => {
  const now = nowIso();
  const contribution: Contribution = {
    id: input.id,
    task_id: input.task_id,
    contributor_id: input.contributor_id,
    submitted_work_url: input.submitted_work_url,
    submission_notes: input.submission_notes,
    status: "SUBMITTED",
    cp_awarded: null,
    approver_id: null,
    approval_date: null,
    approval_notes: null,
    github_pr_number: input.github_pr_number,
    submission_date: now,
  };
  const saved = await putContribution(contribution);
  await touchContributorLastActive(input.contributor_id);
  return saved;
};

export const approveContribution = async (input: {
  contribution_id: string;
  approver_id: string;
  status: ContributionStatus;
  cp_awarded: number | null;
  approval_notes: string | null;
}): Promise<Contribution> => {
  const existing = await getContribution(input.contribution_id);
  if (!existing) {
    throw new Error("Contribution not found");
  }

  const updated: Contribution = {
    ...existing,
    status: input.status,
    cp_awarded: input.cp_awarded,
    approver_id: input.approver_id,
    approval_date: nowIso(),
    approval_notes: input.approval_notes,
  };

  const saved = await putContribution(updated);

  // Best-effort contributor stats update when newly approving
  const wasApproved = existing.status === "APPROVED";
  const becomesApproved = input.status === "APPROVED" && input.cp_awarded !== null;
  if (!wasApproved && becomesApproved) {
    const contributor = await getContributor(existing.contributor_id);
    if (contributor) {
      await putContributor({
        ...contributor,
        total_tasks_completed: contributor.total_tasks_completed + 1,
        last_active_date: nowIso(),
      });
    }
  }

  return saved;
};

export const listContributions = async (filter?: {
  task_id?: string;
  contributor_id?: string;
  status?: ContributionStatus;
}): Promise<Contribution[]> => {
  const TableName = process.env.CONTRIBUTIONS_TABLE_NAME!;
  try {
    let items: Contribution[] = [];
    if (filter?.task_id) {
      const resp = await docClient.send(
        new QueryCommand({
          TableName,
          IndexName: "task_id-index",
          KeyConditionExpression: "task_id = :tid",
          ExpressionAttributeValues: { ":tid": filter.task_id },
        })
      );
      items = (resp.Items ?? []) as Contribution[];
    } else if (filter?.contributor_id) {
      const resp = await docClient.send(
        new QueryCommand({
          TableName,
          IndexName: "contributor_id-index",
          KeyConditionExpression: "contributor_id = :cid",
          ExpressionAttributeValues: { ":cid": filter.contributor_id },
        })
      );
      items = (resp.Items ?? []) as Contribution[];
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
      items = (resp.Items ?? []) as Contribution[];
    } else {
      const resp = await docClient.send(new ScanCommand({ TableName }));
      items = (resp.Items ?? []) as Contribution[];
    }

    if (filter?.status) {
      items = items.filter((c) => c.status === filter.status);
    }
    return items;
  } catch (error) {
    console.error("Error listing contributions", error);
    throw error;
  }
};

// FeatureDistribution

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

  // Best-effort token accounting: only count tokens when a distribution is confirmed.
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
  contributor_id?: string;
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
    } else if (filter?.task_id) {
      const resp = await docClient.send(new ScanCommand({ TableName }));
      items = ((resp.Items ?? []) as FeatureDistribution[]).filter(
        (distribution) => distribution.task_id === filter.task_id
      );
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

    if (filter?.transaction_status) {
      items = items.filter((d) => d.transaction_status === filter.transaction_status);
    }
    return items;
  } catch (error) {
    console.error("Error listing distributions", error);
    throw error;
  }
};
