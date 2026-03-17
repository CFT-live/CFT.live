import { getCompletedFeature } from "./dynamo.helpers";
import { validateGetCompletedFeatureParams } from "./validateParams";

export const handler = async (event: any) => {
  /**
   * POST /completed-features/get
   */
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const paramsValidation = validateGetCompletedFeatureParams(params);
    if (!paramsValidation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: paramsValidation.error.flatten().fieldErrors,
        }),
      };
    }

    const feature = await getCompletedFeature(paramsValidation.data.id);
    if (!feature) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Completed feature not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ feature }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify(err),
    };
  }
};