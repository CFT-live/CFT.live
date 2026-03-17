import { formatUnits, isAddress, keccak256, parseUnits, stringToHex } from "viem";

import type {
  Contribution,
  Feature,
  FeatureDistribution,
  Task,
} from "./api/types";

export type PublicContributor = {
  id: string;
  wallet_address: string;
  username: string;
  github_username: string | null;
  telegram_handle: string | null;
  roles: string[];
  status: string;
};

export type PayoutPlanIssue = {
  taskId: string;
  taskName: string;
  reason: string;
};

export type TaskPayoutPlanItem = {
  task: Task;
  contribution: Contribution;
  contributor: PublicContributor;
  cpAwarded: number;
  tokenAmount: number;
  tokenAmountDisplay: string;
  tokenAmountRaw: string;
  taskIdBytes32: `0x${string}`;
};

export type FeaturePayoutPlan = {
  items: TaskPayoutPlanItem[];
  issues: PayoutPlanIssue[];
  totalCpAwarded: number;
  totalTokenAmountDisplay: string;
};

type BuildFeaturePayoutPlanArgs = {
  feature: Feature;
  tasks: Task[];
  contributions: Contribution[];
  contributorsById: Record<string, PublicContributor>;
  existingDistributions: FeatureDistribution[];
  cftDecimals: number;
};

type PayoutEntry = {
  task: Task;
  contribution: Contribution;
  contributor: PublicContributor;
  cpAwarded: number;
  numerator: bigint;
  baseAmount: bigint;
  remainder: bigint;
  taskIdBytes32: `0x${string}`;
};

function toSafeDisplayNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toDistributorTaskId(taskId: string): `0x${string}` {
  return keccak256(stringToHex(taskId));
}

function buildActiveDistributionsByTaskId(
  existingDistributions: FeatureDistribution[],
) {
  return new Map(
    existingDistributions
      .filter((distribution) => distribution.transaction_status !== "Failed")
      .map((distribution) => [distribution.task_id, distribution]),
  );
}

function groupEligibleContributions(contributions: Contribution[]) {
  const eligibleByTaskId = new Map<string, Contribution[]>();

  for (const contribution of contributions) {
    if (contribution.status !== "APPROVED") continue;
    if (contribution.cp_awarded === null || contribution.cp_awarded <= 0) continue;

    const current = eligibleByTaskId.get(contribution.task_id) ?? [];
    current.push(contribution);
    eligibleByTaskId.set(contribution.task_id, current);
  }

  return eligibleByTaskId;
}

function getTaskValidationError(args: {
  activeDistributionsByTaskId: Map<string, FeatureDistribution>;
  contributor: PublicContributor | undefined;
  eligible: Contribution[];
  task: Task;
}) {
  const { activeDistributionsByTaskId, contributor, eligible, task } = args;

  if (eligible.length === 0) {
    return "Task must have exactly one approved contribution with CP awarded.";
  }

  if (eligible.length > 1) {
    return "Task has multiple approved contributions. Resolve to one final approved contribution before completion.";
  }

  if (activeDistributionsByTaskId.has(task.id)) {
    return "Task already has a non-failed payout record.";
  }

  if (!contributor) {
    return "Contributor profile could not be resolved for payout.";
  }

  if (!isAddress(contributor.wallet_address)) {
    return "Contributor wallet address is missing or invalid.";
  }

  return null;
}

function collectPayoutEntries(args: {
  tasks: Task[];
  eligibleByTaskId: Map<string, Contribution[]>;
  contributorsById: Record<string, PublicContributor>;
  activeDistributionsByTaskId: Map<string, FeatureDistribution>;
}) {
  const { tasks, eligibleByTaskId, contributorsById, activeDistributionsByTaskId } = args;
  const issues: PayoutPlanIssue[] = [];
  const validEntries: PayoutEntry[] = [];

  for (const task of tasks) {
    const eligible = eligibleByTaskId.get(task.id) ?? [];
    const contribution = eligible[0];
    const contributor = contribution
      ? contributorsById[contribution.contributor_id]
      : undefined;
    const validationError = getTaskValidationError({
      activeDistributionsByTaskId,
      contributor,
      eligible,
      task,
    });

    if (validationError) {
      issues.push({
        taskId: task.id,
        taskName: task.name,
        reason: validationError,
      });
      continue;
    }

    validEntries.push({
      task,
      contribution,
      contributor,
      cpAwarded: contribution.cp_awarded ?? 0,
      numerator: BigInt(0),
      baseAmount: BigInt(0),
      remainder: BigInt(0),
      taskIdBytes32: toDistributorTaskId(task.id),
    });
  }

  return { issues, validEntries };
}

function allocateRewardBaseUnits(args: {
  entries: PayoutEntry[];
  totalCpAwarded: number;
  totalRewardRaw: bigint;
}) {
  const { entries, totalCpAwarded, totalRewardRaw } = args;
  const totalCpBigInt = BigInt(totalCpAwarded);

  for (const entry of entries) {
    entry.numerator = totalRewardRaw * BigInt(entry.cpAwarded);
    entry.baseAmount = entry.numerator / totalCpBigInt;
    entry.remainder = entry.numerator % totalCpBigInt;
  }

  let allocated = entries.reduce(
    (sum, entry) => sum + entry.baseAmount,
    BigInt(0),
  );
  let remainderUnits = totalRewardRaw - allocated;
  const sortedForRemainder = [...entries].sort((left, right) => {
    if (left.remainder === right.remainder) {
      return left.task.id.localeCompare(right.task.id);
    }

    return left.remainder > right.remainder ? -1 : 1;
  });

  for (const entry of sortedForRemainder) {
    if (remainderUnits <= BigInt(0)) break;
    entry.baseAmount += BigInt(1);
    remainderUnits -= BigInt(1);
  }

  allocated = entries.reduce(
    (sum, entry) => sum + entry.baseAmount,
    BigInt(0),
  );

  return allocated;
}

function toTaskPayoutPlanItems(entries: PayoutEntry[], cftDecimals: number) {
  return entries
    .map((entry) => {
      const tokenAmountDisplay = formatUnits(entry.baseAmount, cftDecimals);
      return {
        task: entry.task,
        contribution: entry.contribution,
        contributor: entry.contributor,
        cpAwarded: entry.cpAwarded,
        tokenAmount: toSafeDisplayNumber(tokenAmountDisplay),
        tokenAmountDisplay,
        tokenAmountRaw: entry.baseAmount.toString(),
        taskIdBytes32: entry.taskIdBytes32,
      };
    })
    .sort((left, right) => left.task.name.localeCompare(right.task.name));
}

export function buildFeaturePayoutPlan({
  feature,
  tasks,
  contributions,
  contributorsById,
  existingDistributions,
  cftDecimals,
}: BuildFeaturePayoutPlanArgs): FeaturePayoutPlan {
  const activeDistributionsByTaskId = buildActiveDistributionsByTaskId(
    existingDistributions,
  );
  const eligibleByTaskId = groupEligibleContributions(contributions);
  const { issues, validEntries } = collectPayoutEntries({
    tasks,
    eligibleByTaskId,
    contributorsById,
    activeDistributionsByTaskId,
  });

  const totalCpAwarded = validEntries.reduce((sum, entry) => sum + entry.cpAwarded, 0);
  if (validEntries.length === 0 || totalCpAwarded <= 0) {
    return {
      items: [],
      issues,
      totalCpAwarded,
      totalTokenAmountDisplay: "0",
    };
  }

  const totalRewardRaw = parseUnits(feature.total_tokens_reward.toString(), cftDecimals);
  const allocated = allocateRewardBaseUnits({
    entries: validEntries,
    totalCpAwarded,
    totalRewardRaw,
  });
  const items = toTaskPayoutPlanItems(validEntries, cftDecimals);

  return {
    items,
    issues,
    totalCpAwarded,
    totalTokenAmountDisplay: formatUnits(allocated, cftDecimals),
  };
}

export function formatPayoutIssues(issues: PayoutPlanIssue[]): string {
  return issues
    .map((issue) => `${issue.taskName}: ${issue.reason}`)
    .join("\n");
}

export function buildPayoutConfirmationMessage(plan: FeaturePayoutPlan): string {
  const lines = plan.items.map(
    (item) =>
      `- ${item.task.name}: ${item.contributor.username} gets ${item.tokenAmountDisplay} CFT for ${item.cpAwarded} CP`,
  );

  return [
    "Mark this feature as COMPLETED and execute contributor payouts?",
    "",
    `Tasks to pay: ${plan.items.length}`,
    `Total CP: ${plan.totalCpAwarded}`,
    `Total payout: ${plan.totalTokenAmountDisplay} CFT`,
    "",
    ...lines,
    "",
    "The admin wallet will be asked to confirm one payout transaction per task.",
    "The feature will be marked completed only after all payouts are confirmed.",
  ].join("\n");
}