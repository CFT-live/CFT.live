import { deleteFeature } from "./dynamo/dynamo.helpers";
import { validateDeleteFeatureParams } from "./validateParams";

export const handler = async (event: any) => {
  /**
   * POST /features/delete
   */
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const paramsValidation = validateDeleteFeatureParams(params);
    if (!paramsValidation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: paramsValidation.error.flatten().fieldErrors,
        }),
      };
    }

    const deleted = await deleteFeature(paramsValidation.data.id);
    if (!deleted) {
      return { statusCode: 404, body: JSON.stringify({ error: "Feature not found" }) };
    }

    return { statusCode: 200, body: JSON.stringify(deleted) };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify(err),
    };
  }
};
