import type {
  Contribution,
  Contributor,
  Feature,
  CompletedFeature,
  FeatureDistribution,
  MutableFeatureStatus,
  Task,
  TaskStatus,
  TaskType,
  TransactionStatus,
} from "./types";

export type AuthSession = {
  address: string;
  chainId: number;
};

async function apiFetch<T>(
  pathname: string,
  options: {
    method?: string;
    body?: unknown;
  } = {}
): Promise<T> {
  const method = options.method ?? "POST";
  const bodyText = options.body ? JSON.stringify(options.body) : "";

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  const res = await fetch(pathname, {
    method,
    cache: "no-store",
    headers,
    body: bodyText || undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      throw new Error(text || "Authentication required");
    }

    throw new Error(text || `Request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const res = await fetch("/api/auth/siwe/session", {
    cache: "no-store",
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }

  const session: AuthSession | null = await res.json();
  return session;
}

export async function listTasks(input: {
  status?: TaskStatus | "ALL";
  type?: TaskType | "ALL";
  q?: string;
  feature_id?: string;
}): Promise<{ tasks: Task[] }> {
  const status = input.status && input.status !== "ALL" ? input.status : undefined;
  const type = input.type && input.type !== "ALL" ? input.type : undefined;

  return apiFetch("/api/tasks", {
    body: {
      filter: {
        status,
        task_type: type,
        feature_id: input.feature_id || undefined,
        q: input.q || undefined,
      },
    },
  });
}

export async function createTask(input: {
  feature_id: string;
  name: string;
  description: string;
  task_type: TaskType;
  acceptance_criteria: string;
  status: TaskStatus;
}): Promise<{ task: Task }> {
  return apiFetch("/api/tasks/update", {
    body: {
      feature_id: input.feature_id,
      name: input.name,
      description: input.description,
      task_type: input.task_type,
      acceptance_criteria: input.acceptance_criteria,
      status: input.status,
    },
  });
}
export async function getTask(taskId: string): Promise<{ task: Task }> {
  return apiFetch("/api/tasks/get", {
    body: { id: taskId },
  });
}

export async function patchTask(
  taskId: string,
  patch: {
    feature_id: string;
    name: string;
    description: string;
    task_type: TaskType;
    acceptance_criteria: string;
    status: TaskStatus;
    claimed_by_id?: string | null;
    claimed_date?: string | null;
  }
): Promise<{ task: Task }> {
  const body: Record<string, unknown> = {
    id: taskId,
    feature_id: patch.feature_id,
    name: patch.name,
    description: patch.description,
    task_type: patch.task_type,
    acceptance_criteria: patch.acceptance_criteria,
    status: patch.status,
  };

  if (patch.claimed_by_id !== undefined) body.claimed_by_id = patch.claimed_by_id;
  if (patch.claimed_date !== undefined) body.claimed_date = patch.claimed_date;

  return apiFetch("/api/tasks/update", {
    body,
  });
}

export async function deleteTask(taskId: string): Promise<{ task: Task }> {
  return apiFetch("/api/tasks/delete", {
    body: { id: taskId },
  });
}

export async function claimTask(input: {
  task_id: string;
  action: "CLAIM" | "UNCLAIM";
}): Promise<{ task: Task }> {
  return apiFetch("/api/tasks/claim", {
    body: {
      task_id: input.task_id,
      action: input.action,
    },
  });
}

export async function submitContribution(input: {
  task_id: string;
  submitted_work_url: string;
  submission_notes?: string | null;
  github_pr_number?: number | null;
}): Promise<{ contribution: Contribution }> {
  return apiFetch("/api/contributions/submit", {
    body: {
      task_id: input.task_id,
      submitted_work_url: input.submitted_work_url,
      submission_notes: input.submission_notes ?? null,
      github_pr_number: input.github_pr_number ?? null,
    },
  });
}

export async function listContributions(input: {
  task_id?: string;
  contributor_id?: string;
  status?: Contribution["status"];
}): Promise<{ contributions: Contribution[] }> {
  return apiFetch("/api/contributions", {
    body: {
      filter: {
        task_id: input.task_id,
        contributor_id: input.contributor_id,
        status: input.status,
      },
    },
  });
}

export async function approveContribution(input: {
  contribution_id: string;
  status: Contribution["status"];
  cp_awarded?: number | null;
  approval_notes?: string | null;
}): Promise<{ contribution: Contribution }> {
  return apiFetch("/api/contributions/approve", {
    body: {
      contribution_id: input.contribution_id,
      status: input.status,
      cp_awarded: input.cp_awarded ?? null,
      approval_notes: input.approval_notes ?? null,
    },
  });
}

export async function listFeatures(input?: {
  status?: Feature["status"];
  category?: string;
  created_by_id?: string;
  q?: string;
}): Promise<{ features: Feature[] }> {
  return apiFetch("/api/features", {
    body: {
      filter: {
        status: input?.status,
        category: input?.category,
        created_by_id: input?.created_by_id,
        q: input?.q,
      },
    },
  });
}

export async function getFeature(featureId: string): Promise<{ feature: Feature }> {
  try {
    return await apiFetch("/api/features/get", { body: { id: featureId } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/not found/i.test(message)) {
      throw error;
    }

    return getCompletedFeature(featureId);
  }
}

export async function listCompletedFeatures(input?: {
  category?: string;
  created_by_id?: string;
  q?: string;
}): Promise<{ features: CompletedFeature[] }> {
  return apiFetch("/api/completed-features", {
    body: {
      filter: {
        category: input?.category,
        created_by_id: input?.created_by_id,
        q: input?.q,
      },
    },
  });
}

export async function getCompletedFeature(
  featureId: string
): Promise<{ feature: CompletedFeature }> {
  return apiFetch("/api/completed-features/get", { body: { id: featureId } });
}

export async function createFeature(input: {
  name: string;
  description: string;
  category: string;
  total_tokens_reward: number;
  status: MutableFeatureStatus;
  discussions_url?: string | null;
}): Promise<{ feature: Feature }> {
  return apiFetch("/api/features/create", {
    body: {
      name: input.name,
      description: input.description,
      category: input.category,
      total_tokens_reward: input.total_tokens_reward,
      status: input.status,
      discussions_url: input.discussions_url,
    },
  });
}

export async function updateFeature(input: {
  id: string;
  name: string;
  description: string;
  category: string;
  total_tokens_reward: number;
  status: MutableFeatureStatus;
  discussions_url?: string | null;
}): Promise<{ feature: Feature }> {
  return apiFetch("/api/features/update", {
    body: {
      id: input.id,
      name: input.name,
      description: input.description,
      category: input.category,
      total_tokens_reward: input.total_tokens_reward,
      status: input.status,
      discussions_url: input.discussions_url,
    },
  });
}

export async function markFeatureComplete(
  featureId: string
): Promise<{ feature: CompletedFeature }> {
  return apiFetch("/api/features/complete", {
    body: { id: featureId },
  });
}

export async function deleteFeature(featureId: string): Promise<{ feature: Feature }> {
  return apiFetch("/api/features/delete", {
    body: { id: featureId },
  });
}

export async function listDistributions(input?: {
  feature_id?: string;
  task_id?: string;
  contributor_id?: string;
  transaction_status?: TransactionStatus;
}): Promise<{ distributions: FeatureDistribution[] }> {
  return apiFetch("/api/distributions", {
    body: {
      filter: {
        feature_id: input?.feature_id,
        task_id: input?.task_id,
        contributor_id: input?.contributor_id,
        transaction_status: input?.transaction_status,
      },
    },
  });
}

export async function createDistribution(input: {
  feature_id: string;
  task_id: string;
  contribution_id: string;
  contributor_id: string;
  cp_amount: number;
  token_amount: number;
  token_amount_raw: string;
  transaction_status: TransactionStatus;
  arbitrum_tx_hash?: string | null;
}): Promise<{ distribution: FeatureDistribution }> {
  return apiFetch("/api/distributions/create", {
    body: {
      feature_id: input.feature_id,
      task_id: input.task_id,
      contribution_id: input.contribution_id,
      contributor_id: input.contributor_id,
      cp_amount: input.cp_amount,
      token_amount: input.token_amount,
      token_amount_raw: input.token_amount_raw,
      transaction_status: input.transaction_status,
      arbitrum_tx_hash: input.arbitrum_tx_hash ?? null,
    },
  });
}

export async function updateDistribution(input: {
  id: string;
  transaction_status: TransactionStatus;
  arbitrum_tx_hash?: string | null;
}): Promise<{ distribution: FeatureDistribution }> {
  return apiFetch("/api/distributions/update", {
    body: {
      id: input.id,
      transaction_status: input.transaction_status,
      arbitrum_tx_hash: input.arbitrum_tx_hash ?? null,
    },
  });
}

export async function getMyContributor(): Promise<{ contributor: Contributor }> {
  return apiFetch("/api/contributors/get", { body: {} });
}

export async function upsertMyContributor(input: {
  username: string;
  email?: string | null;
  github_username?: string | null;
  telegram_handle?: string | null;
  bio?: string | null;
  profile_image_url?: string | null;
}): Promise<{ contributor: Contributor }> {
  return apiFetch("/api/contributors/update", {
    body: {
      username: input.username,
      email: input.email ?? null,
      github_username: input.github_username ?? null,
      telegram_handle: input.telegram_handle ?? null,
      bio: input.bio ?? null,
      profile_image_url: input.profile_image_url ?? null,
    },
  });
}
