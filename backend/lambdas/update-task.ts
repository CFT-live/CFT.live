import { randomUUID } from "crypto";
import { upsertTask } from "./dynamo.helpers";
import { validateUpdateTaskParams } from "./validateParams";

export const handler = async (event: any) => {
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const paramsValidation = validateUpdateTaskParams(params);
    if (!paramsValidation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: paramsValidation.error.flatten().fieldErrors,
        }),
      };
    }

    const id = paramsValidation.data.id ?? randomUUID();

    const savedTask = await upsertTask({
      id,
      feature_id: paramsValidation.data.feature_id,
      name: paramsValidation.data.name,
      description: paramsValidation.data.description,
      task_type: paramsValidation.data.task_type,
      acceptance_criteria: paramsValidation.data.acceptance_criteria,
      status: paramsValidation.data.status,
      claimed_by_id: paramsValidation.data.claimed_by_id,
      claimed_date: paramsValidation.data.claimed_date,
      created_by_id: paramsValidation.data.created_by_id,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(savedTask),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify(err),
    };
  }
};
