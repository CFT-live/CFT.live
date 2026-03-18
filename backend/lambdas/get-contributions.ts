import { listContributions } from "./dynamo/dynamo.helpers";
import { validateGetContributionsParams } from "./validateParams";

export const handler = async (event: any) => {
  /**
   * POST /contributions
   */
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const paramsValidation = validateGetContributionsParams(params);
    if (!paramsValidation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: paramsValidation.error.flatten().fieldErrors,
        }),
      };
    }

    const contributions = await listContributions(paramsValidation.data.filter);
    return {
      statusCode: 200,
      body: JSON.stringify({ contributions }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
