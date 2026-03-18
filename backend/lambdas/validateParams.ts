import { z } from "zod";
import {
  ContributionStatus,
  TeamRole,
  FeatureStatus,
  TaskStatus,
  TaskType,
  TransactionStatus,
} from "./schemas";

const IsoDateTime = z.string().datetime();

export const validateUpdateContributorParams = (params: any) => {
  return z
    .object({
      wallet_address: z.string().min(1),
      username: z.string().min(1).max(64),
      email: z.string().email().nullable().optional(),
      github_username: z.string().min(1).max(39).nullable().optional(),
      telegram_handle: z.string().min(1).max(64).nullable().optional(),
      bio: z.string().max(2000).nullable().optional(),
      profile_image_url: z.string().url().max(2048).nullable().optional(),
      roles: z.array(TeamRole).optional(),
      status: z.enum(["ACTIVE", "INACTIVE", "BANNED"]).optional(),
    })
    .transform((data) => {
      const normalizedRoles = data.roles
        ? Array.from(new Set(data.roles))
        : undefined;

      return {
        wallet_address: data.wallet_address,
        username: data.username,
        email: data.email ?? null,
        github_username: data.github_username ?? null,
        telegram_handle: data.telegram_handle ?? null,
        bio: data.bio ?? null,
        profile_image_url: data.profile_image_url ?? null,
        roles: normalizedRoles,
        status: data.status,
      };
    })
    .safeParse(params);
};

export const validateGetContributorParams = (params: any) => {
  return z
    .object({
      id: z.string().min(1).optional(),
      wallet_address: z.string().min(1).optional(),
    })
    .refine((v) => Boolean(v.id || v.wallet_address), {
      message: "id or wallet_address required",
    })
    .safeParse(params);
};

export const validateGetContributorsParams = (params: any) => {
  return z
    .object({
      filter: z
        .object({
          status: z.enum(["ACTIVE", "INACTIVE", "BANNED"]).optional(),
          roles: z.array(TeamRole).optional(),
          q: z.string().max(200).optional(),
        })
        .optional(),
    })
    .safeParse(params ?? {});
};

export const validateUpdateTaskParams = (params: any) => {
  return z
    .object({
      id: z.string().min(1).optional(),
      feature_id: z.string().min(1),
      name: z.string().min(1).max(200),
      description: z.string().max(10000),
      task_type: TaskType,
      acceptance_criteria: z.string().max(10000),
      status: TaskStatus,
      claimed_by_id: z.string().min(1).nullable().optional(),
      claimed_date: IsoDateTime.nullable().optional(),
      created_by_id: z.string().min(1).optional(),
    })
    .transform((data) => {
      const out: Record<string, unknown> = {
        ...data,
        created_by_id: data.created_by_id ?? "system",
      };

      // Only include claim fields when explicitly provided.
      // This avoids writing NULLs for DynamoDB GSIs and prevents accidental claim clearing.
      if (data.claimed_by_id !== undefined) {
        out.claimed_by_id = data.claimed_by_id ?? null;
      }
      if (data.claimed_date !== undefined) {
        out.claimed_date = data.claimed_date ?? null;
      }

      return out as any;
    })
    .safeParse(params);
};

export const validateGetTasksParams = (params: any) => {
  return z
    .object({
      filter: z
        .object({
          status: TaskStatus.optional(),
          task_type: TaskType.optional(),
          feature_id: z.string().min(1).optional(),
          q: z.string().max(200).optional(),
        })
        .optional(),
    })
    .safeParse(params ?? {});
};

const validateIdParam = (params: any) => {
  return z
    .object({
      id: z.string().min(1),
    })
    .safeParse(params);
};

export const validateGetTaskParams = (params: any) => {
  return validateIdParam(params);
};

export const validateDeleteTaskParams = (params: any) => {
  return validateIdParam(params);
};

// Features

const MutableFeatureStatus = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "CANCELLED",
]);

export const validateCreateFeatureParams = (params: any) => {
  return z
    .object({
      name: z.string().min(1).max(200),
      description: z.string().max(10000),
      category: z.string().min(1).max(64),
      total_tokens_reward: z.number().nonnegative().default(0),
      status: MutableFeatureStatus,
      created_by_id: z.string().min(1).optional(),
      discussions_url: z.string().url().nullable().optional(),
    })
    .transform((data) => ({
      ...data,
      total_tokens_reward:
        typeof data.total_tokens_reward === "number"
          ? data.total_tokens_reward
          : Number(data.total_tokens_reward),
      created_by_id: data.created_by_id ?? "system",
    }))
    .safeParse(params);
};

export const validateUpdateFeatureParams = (params: any) => {
  return z
    .object({
      id: z.string().min(1),
      name: z.string().min(1).max(200),
      description: z.string().max(10000),
      category: z.string().min(1).max(64),
      total_tokens_reward: z.number().nonnegative().default(0),
      status: MutableFeatureStatus,
      created_by_id: z.string().min(1).optional(),
      discussions_url: z.string().url().nullable().optional(),
    })
    .transform((data) => ({
      ...data,
      total_tokens_reward:
        typeof data.total_tokens_reward === "number"
          ? data.total_tokens_reward
          : Number(data.total_tokens_reward),
      created_by_id: data.created_by_id ?? "system",
    }))
    .safeParse(params);
};

export const validateGetFeatureParams = (params: any) => {
  return validateIdParam(params);
};

export const validateGetFeaturesParams = (params: any) => {
  return z
    .object({
      filter: z
        .object({
          status: FeatureStatus.optional(),
          category: z.string().min(1).max(64).optional(),
          created_by_id: z.string().min(1).optional(),
          q: z.string().max(200).optional(),
        })
        .optional(),
    })
    .safeParse(params ?? {});
};

export const validateDeleteFeatureParams = (params: any) => {
  return validateIdParam(params);
};

export const validateCompleteFeatureParams = (params: any) => {
  return z
    .object({
      id: z.string().min(1),
      completed_by_id: z.string().min(1),
    })
    .safeParse(params);
};

export const validateGetCompletedFeatureParams = (params: any) => {
  return validateIdParam(params);
};

export const validateGetCompletedFeaturesParams = (params: any) => {
  return z
    .object({
      filter: z
        .object({
          category: z.string().min(1).max(64).optional(),
          created_by_id: z.string().min(1).optional(),
          q: z.string().max(200).optional(),
        })
        .optional(),
    })
    .safeParse(params ?? {});
};

// Contributions

export const validateSubmitContributionParams = (params: any) => {
  return z
    .object({
      task_id: z.string().min(1),
      contributor_id: z.string().min(1),
      submitted_work_url: z.string().url().max(2048),
      submission_notes: z.string().max(5000).nullable().optional(),
      github_pr_number: z.number().int().positive().nullable().optional(),
    })
    .transform((data) => ({
      ...data,
      submission_notes: data.submission_notes ?? null,
      github_pr_number: data.github_pr_number ?? null,
    }))
    .safeParse(params);
};

export const validateApproveContributionParams = (params: any) => {
  return z
    .object({
      contribution_id: z.string().min(1),
      approver_id: z.string().min(1),
      status: z.enum(["APPROVED", "REJECTED", "CHANGES_REQUESTED"]),
      cp_awarded: z.number().nonnegative().nullable().optional(),
      approval_notes: z.string().max(5000).nullable().optional(),
    })
    .superRefine((data, ctx) => {
      const cp = data.cp_awarded ?? null;
      if (data.status === "APPROVED") {
        if (cp === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "cp_awarded is required when approving",
            path: ["cp_awarded"],
          });
        }
      } else if (cp !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "cp_awarded must be null unless status is APPROVED",
          path: ["cp_awarded"],
        });
      }
    })
    .transform((data) => ({
      ...data,
      cp_awarded: data.cp_awarded ?? null,
      approval_notes: data.approval_notes ?? null,
    }))
    .safeParse(params);
};

export const validateGetContributionParams = (params: any) => {
  return validateIdParam(params);
};

export const validateGetContributionsParams = (params: any) => {
  return z
    .object({
      filter: z
        .object({
          task_id: z.string().min(1).optional(),
          contributor_id: z.string().min(1).optional(),
          status: ContributionStatus.optional(),
        })
        .optional(),
    })
    .safeParse(params ?? {});
};

// FeatureDistribution

export const validateUpsertDistributionParams = (params: any) => {
  return z
    .object({
      id: z.string().min(1).optional(),
      feature_id: z.string().min(1),
      task_id: z.string().min(1),
      contribution_id: z.string().min(1),
      payout_key: z.string().min(1),
      contributor_id: z.string().min(1),
      cp_amount: z.number().nonnegative(),
      token_amount: z.number().nonnegative(),
      token_amount_raw: z.string().min(1),
      arbitrum_tx_hash: z.string().min(1).max(100).nullable().optional(),
      approver_id: z.string().min(1),
      transaction_status: TransactionStatus,
    })
    .transform((data) => ({
      ...data,
      arbitrum_tx_hash: data.arbitrum_tx_hash ?? null,
    }))
    .safeParse(params);
};

export const validateUpdateDistributionTxParams = (params: any) => {
  return z
    .object({
      id: z.string().min(1),
      transaction_status: TransactionStatus,
      arbitrum_tx_hash: z.string().min(1).max(100).nullable().optional(),
      approver_id: z.string().min(1),
    })
    .transform((data) => ({
      ...data,
      arbitrum_tx_hash: data.arbitrum_tx_hash ?? null,
    }))
    .safeParse(params);
};

export const validateGetDistributionsParams = (params: any) => {
  return z
    .object({
      filter: z
        .object({
          feature_id: z.string().min(1).optional(),
          task_id: z.string().min(1).optional(),
          contribution_id: z.string().min(1).optional(),
          contributor_id: z.string().min(1).optional(),
          payout_key: z.string().min(1).optional(),
          transaction_status: TransactionStatus.optional(),
        })
        .optional(),
    })
    .safeParse(params ?? {});
};
