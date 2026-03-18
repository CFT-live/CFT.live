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
  payoutKeyBytes32: `0x${string}`;
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
  payoutKeyBytes32: `0x${string}`;
};

function toSafeDisplayNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toDistributorPayoutKey(contributionId: string): `0x${string}` {
  return keccak256(stringToHex(contributionId));
}

function buildActiveDistributionsByContributionId(
  existingDistributions: FeatureDistribution[],
) {
  return new Map(
    existingDistributions
      .filter((distribution) => distribution.transaction_status !== "Failed")
      .map((distribution) => [distribution.contribution_id, distribution]),
  );
}

function buildActiveDistributionsByPayoutKey(
  existingDistributions: FeatureDistribution[],
) {
  return new Map(
    existingDistributions
      .filter(
        (distribution) =>
          distribution.transaction_status !== "Failed" &&
          typeof distribution.payout_key === "string" &&
          distribution.payout_key.length > 0,
      )
      .map((distribution) => [distribution.payout_key as string, distribution]),
  );
}

function getContributionValidationError(args: {
  activeDistributionsByContributionId: Map<string, FeatureDistribution>;
  activeDistributionsByPayoutKey: Map<string, FeatureDistribution>;
  contributor: PublicContributor | undefined;
  contribution: Contribution;
  task: Task;
}) {
  const {
    activeDistributionsByContributionId,
    activeDistributionsByPayoutKey,
    contribution,
    contributor,
  } = args;
  const payoutKey = toDistributorPayoutKey(contribution.id);

  if (activeDistributionsByContributionId.has(contribution.id)) {
    return "Contribution already has a non-failed payout record.";
  }

  if (activeDistributionsByPayoutKey.has(payoutKey)) {
    return "Payout key has already been used by a non-failed payout record.";
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
  contributions: Contribution[];
  contributorsById: Record<string, PublicContributor>;
  activeDistributionsByContributionId: Map<string, FeatureDistribution>;
  activeDistributionsByPayoutKey: Map<string, FeatureDistribution>;
}) {
  const {
    tasks,
    contributions,
    contributorsById,
    activeDistributionsByContributionId,
    activeDistributionsByPayoutKey,
  } = args;
  const issues: PayoutPlanIssue[] = [];
  const validEntries: PayoutEntry[] = [];
  const taskById = new Map(tasks.map((task) => [task.id, task]));

  const eligibleContributions = contributions.filter(
    (contribution) =>
      contribution.status === "APPROVED" &&
      contribution.cp_awarded !== null &&
      contribution.cp_awarded > 0,
  );

  for (const contribution of eligibleContributions) {
    const task = taskById.get(contribution.task_id);
    if (!task) {
      issues.push({
        taskId: contribution.task_id,
        taskName: contribution.task_id,
        reason: "Task could not be resolved for approved contribution payout.",
      });
      continue;
    }

    const contributor = contributorsById[contribution.contributor_id];
    const validationError = getContributionValidationError({
      activeDistributionsByContributionId,
      activeDistributionsByPayoutKey,
      contribution,
      contributor,
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

    if (!contribution || !contributor) {
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
      payoutKeyBytes32: toDistributorPayoutKey(contribution.id),
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
      return left.contribution.id.localeCompare(right.contribution.id);
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
        payoutKeyBytes32: entry.payoutKeyBytes32,
      };
    })
    .sort((left, right) => {
      const byTaskName = left.task.name.localeCompare(right.task.name);
      if (byTaskName !== 0) return byTaskName;

      return left.contribution.id.localeCompare(right.contribution.id);
    });
}

export function buildFeaturePayoutPlan({
  feature,
  tasks,
  contributions,
  contributorsById,
  existingDistributions,
  cftDecimals,
}: BuildFeaturePayoutPlanArgs): FeaturePayoutPlan {
  const activeDistributionsByContributionId = buildActiveDistributionsByContributionId(
    existingDistributions,
  );
  const activeDistributionsByPayoutKey = buildActiveDistributionsByPayoutKey(
    existingDistributions,
  );
  const { issues, validEntries } = collectPayoutEntries({
    tasks,
    contributions,
    contributorsById,
    activeDistributionsByContributionId,
    activeDistributionsByPayoutKey,
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
      `- ${item.task.name}: ${item.contributor.username} gets ${item.tokenAmountDisplay} CFT for ${item.cpAwarded} CP (${item.contribution.contribution_kind})`,
  );

  return [
    "Mark this feature as COMPLETED and execute contributor payouts?",
    "",
    `Contributions to pay: ${plan.items.length}`,
    `Total CP: ${plan.totalCpAwarded}`,
    `Total payout: ${plan.totalTokenAmountDisplay} CFT`,
    "",
    ...lines,
    "",
    "The admin wallet will be asked to confirm one payout transaction per contribution.",
    "The feature will be marked completed only after all payouts are confirmed.",
  ].join("\n");
}