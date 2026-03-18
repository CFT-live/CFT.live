export type TaskStatus =
  | "OPEN"
  | "CLAIMED"
  | "IN_REVIEW"
  | "CHANGES_REQUESTED"
  | "DONE";

export type TaskType =
  | "GENERAL"
  | "TECH"
  | "DESIGN"
  | "MARKETING"
  | "BUSINESS"
  | "DOCS";

export interface Task {
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
  created_date: string;
}

export type ContributorStatus = "ACTIVE" | "INACTIVE" | "BANNED";

export type TeamRole =
  | "ADMIN"
  | "CORE";

export interface Contributor {
  id: string; // wallet_address (lowercased)
  wallet_address: string;
  username: string;
  email: string | null;
  github_username: string | null;
  telegram_handle: string | null;
  bio: string | null;
  profile_image_url: string | null;
  roles: TeamRole[];
  total_tokens_earned: number;
  total_features_contributed: number;
  total_tasks_completed: number;
  created_date: string;
  last_active_date: string;
  status: ContributorStatus;
}

export type ContributionStatus =
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "CHANGES_REQUESTED";

export type ContributionKind = "ORIGINAL" | "REVIEW_REWARD";

export interface Contribution {
  id: string;
  task_id: string;
  contributor_id: string;
  submitted_work_url: string;
  submission_notes: string | null;
  contribution_kind: ContributionKind;
  rewarded_for_contribution_id: string | null;
  status: ContributionStatus;
  cp_awarded: number | null;
  approver_id: string | null;
  approval_date: string | null;
  approval_notes: string | null;
  github_pr_number: number | null;
  submission_date: string;
}

export type FeatureStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type MutableFeatureStatus = Exclude<FeatureStatus, "COMPLETED">;

export interface Feature {
  id: string;
  name: string;
  description: string;
  category: string;
  total_tokens_reward: number;
  status: FeatureStatus;
  created_by_id: string;
  created_date: string;
  discussions_url: string | null;
}

export interface CompletedFeature extends Feature {
  status: "COMPLETED";
  completed_by_id: string;
  completed_date: string;
}

export type TransactionStatus = "Pending" | "Confirmed" | "Failed";

export interface FeatureDistribution {
  id: string;
  feature_id: string;
  task_id: string;
  contribution_id: string;
  payout_key: string | null;
  contributor_id: string;
  cp_amount: number;
  token_amount: number;
  token_amount_raw: string;
  arbitrum_tx_hash: string | null;
  distribution_date: string;
  approver_id: string;
  transaction_status: TransactionStatus;
}
