import { getTask } from "./dynamo.helpers";
import { validateGetTaskParams } from "./validateParams";

export const handler = async (event: any) => {
  /**
   * POST /tasks/get
   * - Get task detail by id
   * - Request body: { id: string }
   */
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const paramsValidation = validateGetTaskParams(params);
    if (!paramsValidation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: paramsValidation.error.flatten().fieldErrors,
        }),
      };
    }

    const task = await getTask(paramsValidation.data.id);
    if (!task) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Task not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ task }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify(err),
    };
  }
};
