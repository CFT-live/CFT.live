import {
  GetCommand,
  GetCommandInput,
  GetCommandOutput,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Contribution, ContributionKind, ContributionStatus } from "../types";
import {
  getContributor,
  putContributor,
  touchContributorLastActive,
} from "./contributors";
import { docClient, nowIso } from "./shared";

export const REVIEWER_REWARD_CP = 1;
export const REVIEWER_REWARD_ID_PREFIX = "review-reward:";

export const normalizeContributionRecord = (record: any): Contribution => {
  const base = record ?? {};
  return {
    ...(base as Contribution),
    contribution_kind: (base.contribution_kind ?? "ORIGINAL") as ContributionKind,
    rewarded_for_contribution_id: base.rewarded_for_contribution_id ?? null,
    submission_notes: base.submission_notes ?? null,
    cp_awarded: base.cp_awarded ?? null,
    approver_id: base.approver_id ?? null,
    approval_date: base.approval_date ?? null,
    approval_notes: base.approval_notes ?? null,
    github_pr_number: base.github_pr_number ?? null,
  };
};

export const isReviewerRewardContribution = (
  contribution: Contribution,
): boolean => contribution.contribution_kind === "REVIEW_REWARD";

export const toReviewerRewardContributionId = (contributionId: string): string =>
  `${REVIEWER_REWARD_ID_PREFIX}${contributionId}`;

export const buildReviewerRewardContribution = (args: {
  approver_id: string;
  approvedContribution: Contribution;
  approval_date: string;
}): Contribution => ({
  id: toReviewerRewardContributionId(args.approvedContribution.id),
  task_id: args.approvedContribution.task_id,
  contributor_id: args.approver_id,
  submitted_work_url: args.approvedContribution.submitted_work_url,
  submission_notes: `Reviewer reward for approving contribution ${args.approvedContribution.id}`,
  contribution_kind: "REVIEW_REWARD",
  rewarded_for_contribution_id: args.approvedContribution.id,
  status: "APPROVED",
  cp_awarded: REVIEWER_REWARD_CP,
  approver_id: args.approver_id,
  approval_date: args.approval_date,
  approval_notes: `System reward for approving contribution ${args.approvedContribution.id}`,
  github_pr_number: args.approvedContribution.github_pr_number,
  submission_date: args.approval_date,
});

export const getContribution = async (id: string): Promise<Contribution | null> => {
  if (!id) return null;
  const params: GetCommandInput = {
    TableName: process.env.CONTRIBUTIONS_TABLE_NAME!,
    Key: { id },
  };
  try {
    const data: GetCommandOutput = await docClient.send(new GetCommand(params));
    return data.Item ? normalizeContributionRecord(data.Item) : null;
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
    contribution_kind: "ORIGINAL",
    rewarded_for_contribution_id: null,
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

  if (isReviewerRewardContribution(existing)) {
    throw new Error("Reviewer reward contributions cannot be reviewed directly");
  }

  if (existing.status === "APPROVED") {
    throw new Error("Approved contributions cannot be changed");
  }

  const approvalDate = nowIso();

  if (input.status === "APPROVED") {
    const reviewerReward = buildReviewerRewardContribution({
      approver_id: input.approver_id,
      approvedContribution: existing,
      approval_date: approvalDate,
    });

    const approvedContribution: Contribution = {
      ...existing,
      contribution_kind: "ORIGINAL",
      rewarded_for_contribution_id: null,
      status: "APPROVED",
      cp_awarded: input.cp_awarded,
      approver_id: input.approver_id,
      approval_date: approvalDate,
      approval_notes: input.approval_notes,
    };

    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: process.env.CONTRIBUTIONS_TABLE_NAME!,
              Item: approvedContribution,
              ConditionExpression:
                "attribute_exists(id) AND #status <> :approved",
              ExpressionAttributeNames: {
                "#status": "status",
              },
              ExpressionAttributeValues: {
                ":approved": "APPROVED",
              },
            },
          },
          {
            Put: {
              TableName: process.env.CONTRIBUTIONS_TABLE_NAME!,
              Item: reviewerReward,
              ConditionExpression: "attribute_not_exists(id)",
            },
          },
        ],
      })
    );

    const contributor = await getContributor(existing.contributor_id);
    if (contributor) {
      await putContributor({
        ...contributor,
        total_tasks_completed: contributor.total_tasks_completed + 1,
        last_active_date: nowIso(),
      });
    }

    await touchContributorLastActive(input.approver_id);
    return approvedContribution;
  }

  const updated: Contribution = {
    ...existing,
    contribution_kind: "ORIGINAL",
    rewarded_for_contribution_id: null,
    status: input.status,
    cp_awarded: null,
    approver_id: input.approver_id,
    approval_date: approvalDate,
    approval_notes: input.approval_notes,
  };

  const saved = await putContribution(updated);
  await touchContributorLastActive(input.approver_id);
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
      items = (resp.Items ?? []).map((item) =>
        normalizeContributionRecord(item),
      ) as Contribution[];
    } else if (filter?.contributor_id) {
      const resp = await docClient.send(
        new QueryCommand({
          TableName,
          IndexName: "contributor_id-index",
          KeyConditionExpression: "contributor_id = :cid",
          ExpressionAttributeValues: { ":cid": filter.contributor_id },
        })
      );
      items = (resp.Items ?? []).map((item) =>
        normalizeContributionRecord(item),
      ) as Contribution[];
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
      items = (resp.Items ?? []).map((item) =>
        normalizeContributionRecord(item),
      ) as Contribution[];
    } else {
      const resp = await docClient.send(new ScanCommand({ TableName }));
      items = (resp.Items ?? []).map((item) =>
        normalizeContributionRecord(item),
      ) as Contribution[];
    }

    if (filter?.status) {
      items = items.filter((contribution) => contribution.status === filter.status);
    }
    return items;
  } catch (error) {
    console.error("Error listing contributions", error);
    throw error;
  }
};