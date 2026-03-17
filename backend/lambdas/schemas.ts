import { z } from "zod";

// Contributors
export const ContributorStatus = z.enum(["ACTIVE", "INACTIVE", "BANNED"]);

export const TeamRole = z.enum([
  "CORE",
  "ADMIN",
]);

export const ContributorSchema = z.object({
  id: z.string().min(1),
  wallet_address: z.string().min(1),
  username: z.string().min(1).max(64),
  email: z.string().email().nullable(),
  github_username: z.string().min(1).max(39).nullable(),
  telegram_handle: z.string().min(1).max(64).nullable(),
  bio: z.string().max(2000).nullable(),
  profile_image_url: z.string().url().max(2048).nullable(),
  roles: z.array(TeamRole),
  total_tokens_earned: z.number().nonnegative(),
  total_features_contributed: z.number().int().nonnegative(),
  total_tasks_completed: z.number().int().nonnegative(),
  created_date: z.string().datetime(),
  last_active_date: z.string().datetime(),
  status: ContributorStatus,
});

// Features
export const FeatureStatus = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const FeatureSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(10000),
  category: z.string().min(1).max(64),
  total_tokens_reward: z.number().nonnegative(),
  status: FeatureStatus,
  discussions_url: z.string().url().nullable(),
  created_by_id: z.string().min(1),
  created_date: z.string().datetime(),
});

export const CompletedFeatureSchema = FeatureSchema.extend({
  status: z.literal("COMPLETED"),
  completed_by_id: z.string().min(1),
  completed_date: z.string().datetime(),
});

// Tasks
export const TaskStatus = z.enum([
  "OPEN",
  "CLAIMED",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "DONE",
]);

export const TaskType = z.enum([
  "GENERAL",
  "TECH",
  "DESIGN",
  "MARKETING",
  "BUSINESS",
  "DOCS",
]);

export const TaskSchema = z.object({
  id: z.string().min(1),
  feature_id: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(10000),
  task_type: TaskType,
  acceptance_criteria: z.string().max(10000),
  status: TaskStatus,
  claimed_by_id: z.string().min(1).nullable(),
  claimed_date: z.string().datetime().nullable(),
  created_by_id: z.string().min(1),
  created_date: z.string().datetime(),
});

// Contributions
export const ContributionStatus = z.enum([
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "CHANGES_REQUESTED",
]);

export const ContributionSchema = z.object({
  id: z.string().min(1),
  task_id: z.string().min(1),
  contributor_id: z.string().min(1),
  submitted_work_url: z.string().url().max(2048),
  submission_notes: z.string().max(5000).nullable(),
  status: ContributionStatus,
  cp_awarded: z.number().nonnegative().nullable(),
  approver_id: z.string().min(1).nullable(),
  approval_date: z.string().datetime().nullable(),
  approval_notes: z.string().max(5000).nullable(),
  github_pr_number: z.number().int().positive().nullable(),
  submission_date: z.string().datetime(),
});

// FeatureDistribution (payout ledger)
export const TransactionStatus = z.enum(["Pending", "Confirmed", "Failed"]);

export const FeatureDistributionSchema = z.object({
  id: z.string().min(1),
  feature_id: z.string().min(1),
  task_id: z.string().min(1),
  contribution_id: z.string().min(1),
  contributor_id: z.string().min(1),
  cp_amount: z.number().nonnegative(),
  token_amount: z.number().nonnegative(),
  token_amount_raw: z.string().min(1),
  arbitrum_tx_hash: z.string().min(1).max(100).nullable(),
  distribution_date: z.string().datetime(),
  approver_id: z.string().min(1),
  transaction_status: TransactionStatus,
});
