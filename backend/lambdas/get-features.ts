import { listFeatures } from "./dynamo/dynamo.helpers";
import { validateGetFeaturesParams } from "./validateParams";

export const handler = async (event: any) => {
  /**
   * POST /features
   */
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const paramsValidation = validateGetFeaturesParams(params);
    if (!paramsValidation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: paramsValidation.error.flatten().fieldErrors,
        }),
      };
    }

    const features = await listFeatures(paramsValidation.data.filter);
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
