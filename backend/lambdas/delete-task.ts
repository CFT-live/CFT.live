import { deleteTask } from "./dynamo.helpers";
import { validateDeleteTaskParams } from "./validateParams";

export const handler = async (event: any) => {
    try {
        const params = event?.body ? JSON.parse(event.body) : {};
        const paramsValidation = validateDeleteTaskParams(params);
        if (!paramsValidation.success) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: paramsValidation.error.flatten().fieldErrors,
                }),
            };
        }

        const deleted = await deleteTask(paramsValidation.data.id);
        if (!deleted) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: "Task not found" }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(deleted),
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify(err),
        };
    }
};
