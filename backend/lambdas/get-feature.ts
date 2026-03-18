import { getFeature } from "./dynamo/dynamo.helpers";
import { validateGetFeatureParams } from "./validateParams";

export const handler = async (event: any) => {
  /**
   * POST /features/get
   */
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const paramsValidation = validateGetFeatureParams(params);
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
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Feature not found" }),
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
