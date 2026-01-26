import { listContributors } from "./dynamo.helpers";
import { validateGetContributorsParams } from "./validateParams";

export const handler = async (event: any) => {
  /**
   * POST /contributors
   * - Get contributors (optional filters)
   */
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const paramsValidation = validateGetContributorsParams(params);
    if (!paramsValidation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: paramsValidation.error.flatten().fieldErrors,
        }),
      };
    }

    const contributors = await listContributors(paramsValidation.data.filter);

    return {
      statusCode: 200,
      body: JSON.stringify({ contributors }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify(err),
    };
  }
};
