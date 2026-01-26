import { listTasks } from "./dynamo.helpers";
import { validateGetTasksParams } from "./validateParams";

export const handler = async (event: any) => {
    /**
     * POST /tasks
     * - Get tasks
    * - Request body: { filter?: { status?: TaskStatus; task_type?: TaskType; feature_id?: string; q?: string } }
     */
    try {
        const params = event?.body ? JSON.parse(event.body) : {};
        const paramsValidation = validateGetTasksParams(params);
        if (!paramsValidation.success) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: paramsValidation.error.flatten().fieldErrors,
                }),
            };
        }

        const tasks = await listTasks({
            status: paramsValidation.data.filter?.status,
            task_type: paramsValidation.data.filter?.task_type,
            feature_id: paramsValidation.data.filter?.feature_id,
            q: paramsValidation.data.filter?.q,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ tasks }),
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify(err),
        };
    }
};
