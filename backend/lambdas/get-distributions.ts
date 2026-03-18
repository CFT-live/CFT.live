import { listDistributions } from "./dynamo/dynamo.helpers";
import { validateGetDistributionsParams } from "./validateParams";

export const handler = async (event: any) => {
  /**
   * POST /feature-distribution
   */
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const paramsValidation = validateGetDistributionsParams(params);
    if (!paramsValidation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: paramsValidation.error.flatten().fieldErrors,
        }),
      };
    }

    const distributions = await listDistributions(paramsValidation.data.filter);
    return {
      statusCode: 200,
      body: JSON.stringify({ distributions }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
