import {
  DeleteCommand,
  GetCommand,
  GetCommandInput,
  GetCommandOutput,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Task, TaskStatus, TaskType } from "../types";
import { listContributions } from "./contributions";
import { chunkItems, docClient, nowIso } from "./shared";

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

  if (item.claimed_by_id == null) delete item.claimed_by_id;
  if (item.claimed_date == null) delete item.claimed_date;

  return item;
};

const applyTaskFilters = (
  items: Task[],
  filter?: { task_type?: TaskType; q?: string }
): Task[] => {
  if (!filter) return items;
  const q = (filter.q ?? "").trim().toLowerCase();
  return items.filter((task) => {
    if (filter.task_type && task.task_type !== filter.task_type) return false;
    if (q) {
      const haystack = `${task.name} ${task.description} ${task.acceptance_criteria}`
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
};

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

export const deleteTask = async (taskId: string): Promise<Task | null> => {
  if (!taskId) return null;

  try {
    const existingTask = await getTask(taskId);
    if (!existingTask) return null;

    const contributions = await listContributions({ task_id: taskId });
    const contributionDeleteChunks = chunkItems(contributions, 100);

    for (const contributionChunk of contributionDeleteChunks) {
      await docClient.send(
        new TransactWriteCommand({
          TransactItems: contributionChunk.map((contribution) => ({
            Delete: {
              TableName: process.env.CONTRIBUTIONS_TABLE_NAME!,
              Key: { id: contribution.id },
            },
          })),
        })
      );
    }

    const params = {
      TableName: process.env.TASKS_TABLE_NAME!,
      Key: { id: taskId },
      ReturnValues: "ALL_OLD" as const,
    };

    const data = await docClient.send(new DeleteCommand(params));
    return (data.Attributes as Task | undefined) ?? null;
  } catch (error) {
    console.error(`Error deleting task for key: ${taskId}`, error);
    throw error;
  }
};