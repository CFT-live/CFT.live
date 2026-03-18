const mockSend = jest.fn();

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn(),
}));

jest.mock("@aws-sdk/lib-dynamodb", () => {
  class GetCommand {
    input: any;

    constructor(input: any) {
      this.input = input;
    }
  }

  class DeleteCommand {
    input: any;

    constructor(input: any) {
      this.input = input;
    }
  }

  class PutCommand {
    input: any;

    constructor(input: any) {
      this.input = input;
    }
  }

  class QueryCommand {
    input: any;

    constructor(input: any) {
      this.input = input;
    }
  }

  class ScanCommand {
    input: any;

    constructor(input: any) {
      this.input = input;
    }
  }

  class TransactWriteCommand {
    input: any;

    constructor(input: any) {
      this.input = input;
    }
  }

  return {
    DynamoDBDocumentClient: {
      from: jest.fn(() => ({
        send: mockSend,
      })),
    },
    GetCommand,
    DeleteCommand,
    PutCommand,
    QueryCommand,
    ScanCommand,
    TransactWriteCommand,
  };
});

import { deleteTask } from "../lambdas/dynamo/dynamo.helpers";
import type { Contribution, Task } from "../lambdas/types";

describe("deleteTask", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      TASKS_TABLE_NAME: "tasks-table",
      CONTRIBUTIONS_TABLE_NAME: "contributions-table",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("deletes all contributions for the task before deleting the task", async () => {
    const task: Task = {
      id: "task-1",
      feature_id: "feature-1",
      name: "Task 1",
      description: "desc",
      task_type: "TECH",
      acceptance_criteria: "done",
      status: "OPEN",
      claimed_by_id: null,
      claimed_date: null,
      created_by_id: "0xadmin",
      created_date: "2026-03-18T00:00:00.000Z",
    };
    const contributions: Contribution[] = [
      {
        id: "contribution-1",
        task_id: task.id,
        contributor_id: "0xabc",
        submitted_work_url: "https://example.com/1",
        submission_notes: null,
        contribution_kind: "ORIGINAL",
        rewarded_for_contribution_id: null,
        status: "SUBMITTED",
        cp_awarded: null,
        approver_id: null,
        approval_date: null,
        approval_notes: null,
        github_pr_number: null,
        submission_date: "2026-03-18T00:00:00.000Z",
      },
      {
        id: "review-reward:contribution-1",
        task_id: task.id,
        contributor_id: "0xreviewer",
        submitted_work_url: "https://example.com/1",
        submission_notes: "reward",
        contribution_kind: "REVIEW_REWARD",
        rewarded_for_contribution_id: "contribution-1",
        status: "APPROVED",
        cp_awarded: 1,
        approver_id: "0xsystem",
        approval_date: "2026-03-18T01:00:00.000Z",
        approval_notes: "reward",
        github_pr_number: null,
        submission_date: "2026-03-18T01:00:00.000Z",
      },
    ];

    mockSend
      .mockResolvedValueOnce({ Item: task })
      .mockResolvedValueOnce({ Items: contributions })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Attributes: task });

    const deleted = await deleteTask(task.id);

    expect(deleted).toEqual(task);
    expect(mockSend).toHaveBeenCalledTimes(4);
    expect(mockSend.mock.calls[1][0].input).toEqual({
      TableName: "contributions-table",
      IndexName: "task_id-index",
      KeyConditionExpression: "task_id = :tid",
      ExpressionAttributeValues: { ":tid": task.id },
    });
    expect(mockSend.mock.calls[2][0].input).toEqual({
      TransactItems: contributions.map((contribution) => ({
        Delete: {
          TableName: "contributions-table",
          Key: { id: contribution.id },
        },
      })),
    });
    expect(mockSend.mock.calls[3][0].input).toEqual({
      TableName: "tasks-table",
      Key: { id: task.id },
      ReturnValues: "ALL_OLD",
    });
  });

  it("returns null without deleting contributions when the task does not exist", async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    const deleted = await deleteTask("missing-task");

    expect(deleted).toBeNull();
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});