import { completeFeature, getCompletedFeature, getFeature } from "./dynamo.helpers";
import { validateCompleteFeatureParams } from "./validateParams";

export const handler = async (event: any) => {
  /**
   * POST /features/complete
   */
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const paramsValidation = validateCompleteFeatureParams(params);
    if (!paramsValidation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: paramsValidation.error.flatten().fieldErrors,
        }),
      };
    }

    const feature = await getFeature(paramsValidation.data.id);
    if (!feature) {
      const archived = await getCompletedFeature(paramsValidation.data.id);
      if (archived) {
        return {
          statusCode: 409,
          body: JSON.stringify({ error: "Feature is already completed" }),
        };
      }

      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Feature not found" }),
      };
    }

    const saved = await completeFeature({
      feature,
      completed_by_id: paramsValidation.data.completed_by_id,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ feature: saved }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify(err),
    };
  }
};