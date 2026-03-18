jest.mock("../lambdas/dynamo/dynamo.helpers", () => {
	const actual = jest.requireActual("../lambdas/dynamo/dynamo.helpers");
	return {
		...actual,
		approveContribution: jest.fn(),
		getTask: jest.fn(),
		putTask: jest.fn(),
	};
});

import { handler } from "../lambdas/approve-contribution";
import {
	approveContribution,
	buildReviewerRewardContribution,
	getTask,
	normalizeContributionRecord,
	putTask,
	REVIEWER_REWARD_CP,
	toReviewerRewardContributionId,
} from "../lambdas/dynamo/dynamo.helpers";
import { validateApproveContributionParams } from "../lambdas/validateParams";
import type { Contribution, Task } from "../lambdas/types";

const mockedApproveContribution = jest.mocked(approveContribution);
const mockedGetTask = jest.mocked(getTask);
const mockedPutTask = jest.mocked(putTask);

const baseContribution: Contribution = {
	id: "contribution-1",
	task_id: "task-1",
	contributor_id: "0xcontributor",
	submitted_work_url: "https://github.com/example/repo/pull/123",
	submission_notes: "Initial submission",
	contribution_kind: "ORIGINAL",
	rewarded_for_contribution_id: null,
	status: "SUBMITTED",
	cp_awarded: null,
	approver_id: null,
	approval_date: null,
	approval_notes: null,
	github_pr_number: 123,
	submission_date: "2026-03-18T00:00:00.000Z",
};

const baseTask: Task = {
	id: "task-1",
	feature_id: "feature-1",
	name: "Task 1",
	description: "desc",
	task_type: "TECH",
	acceptance_criteria: "done",
	status: "IN_REVIEW",
	claimed_by_id: "0xcontributor",
	claimed_date: "2026-03-17T00:00:00.000Z",
	created_by_id: "0xadmin",
	created_date: "2026-03-16T00:00:00.000Z",
};

describe("contribution review flow", () => {
	beforeEach(() => {
		mockedApproveContribution.mockReset();
		mockedGetTask.mockReset();
		mockedPutTask.mockReset();
	});

	it("rejects SUBMITTED as a review status", () => {
		const result = validateApproveContributionParams({
			contribution_id: "contribution-1",
			approver_id: "0xadmin",
			status: "SUBMITTED",
			cp_awarded: null,
		});

		expect(result.success).toBe(false);
	});

	it("normalizes legacy contribution records to original contributions", () => {
		const normalized = normalizeContributionRecord({
			id: "legacy-1",
			task_id: "task-1",
			contributor_id: "0xcontributor",
			submitted_work_url: "https://example.com/work",
			submission_date: "2026-03-18T00:00:00.000Z",
			status: "SUBMITTED",
		});

		expect(normalized.contribution_kind).toBe("ORIGINAL");
		expect(normalized.rewarded_for_contribution_id).toBeNull();
		expect(normalized.cp_awarded).toBeNull();
	});

	it("builds a reviewer reward contribution linked to the approved original", () => {
		const approvalDate = "2026-03-18T12:00:00.000Z";
		const reward = buildReviewerRewardContribution({
			approver_id: "0xreviewer",
			approvedContribution: {
				...baseContribution,
				status: "APPROVED",
				cp_awarded: 25,
			},
			approval_date: approvalDate,
		});

		expect(reward.id).toBe(toReviewerRewardContributionId(baseContribution.id));
		expect(reward.task_id).toBe(baseContribution.task_id);
		expect(reward.contributor_id).toBe("0xreviewer");
		expect(reward.contribution_kind).toBe("REVIEW_REWARD");
		expect(reward.rewarded_for_contribution_id).toBe(baseContribution.id);
		expect(reward.cp_awarded).toBe(REVIEWER_REWARD_CP);
		expect(reward.status).toBe("APPROVED");
		expect(reward.approval_date).toBe(approvalDate);
	});

	it("marks the task DONE after an approval", async () => {
		mockedApproveContribution.mockResolvedValue({
			...baseContribution,
			status: "APPROVED",
			cp_awarded: 25,
			approver_id: "0xadmin",
			approval_date: "2026-03-18T12:00:00.000Z",
			approval_notes: "Looks good",
		});
		mockedGetTask.mockResolvedValue(baseTask);
		mockedPutTask.mockResolvedValue({
			...baseTask,
			status: "DONE",
		});

		const response = await handler({
			body: JSON.stringify({
				contribution_id: baseContribution.id,
				approver_id: "0xadmin",
				status: "APPROVED",
				cp_awarded: 25,
				approval_notes: "Looks good",
			}),
		});

		expect(response.statusCode).toBe(200);
		expect(mockedPutTask).toHaveBeenCalledWith({
			...baseTask,
			status: "DONE",
		});
	});

	it("reopens the task after a rejection", async () => {
		mockedApproveContribution.mockResolvedValue({
			...baseContribution,
			status: "REJECTED",
			approver_id: "0xadmin",
			approval_date: "2026-03-18T12:00:00.000Z",
			approval_notes: "Needs a rewrite",
		});
		mockedGetTask.mockResolvedValue(baseTask);
		mockedPutTask.mockResolvedValue({
			...baseTask,
			status: "OPEN",
			claimed_by_id: null,
			claimed_date: null,
		});

		const response = await handler({
			body: JSON.stringify({
				contribution_id: baseContribution.id,
				approver_id: "0xadmin",
				status: "REJECTED",
				cp_awarded: null,
				approval_notes: "Needs a rewrite",
			}),
		});

		expect(response.statusCode).toBe(200);
		expect(mockedPutTask).toHaveBeenCalledWith({
			...baseTask,
			status: "OPEN",
			claimed_by_id: null,
			claimed_date: null,
		});
	});

	it("returns 409 for immutable approved contribution updates", async () => {
		mockedApproveContribution.mockRejectedValue(
			new Error("Approved contributions cannot be changed"),
		);

		const response = await handler({
			body: JSON.stringify({
				contribution_id: baseContribution.id,
				approver_id: "0xadmin",
				status: "REJECTED",
				cp_awarded: null,
			}),
		});

		expect(response.statusCode).toBe(409);
		expect(mockedGetTask).not.toHaveBeenCalled();
		expect(JSON.parse(response.body)).toEqual({
			error: "Approved contributions cannot be changed",
		});
	});
});
