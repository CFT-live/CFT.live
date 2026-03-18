import { listCompletedFeatures } from "./dynamo/dynamo.helpers";
import { validateGetCompletedFeaturesParams } from "./validateParams";

export const handler = async (event: any) => {
  /**
   * POST /completed-features
   */
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const paramsValidation = validateGetCompletedFeaturesParams(params);
    if (!paramsValidation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: paramsValidation.error.flatten().fieldErrors,
        }),
      };
    }

    const features = await listCompletedFeatures(paramsValidation.data.filter);
    return {
      statusCode: 200,
      body: JSON.stringify({ features }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify(err),
    };
  }
};