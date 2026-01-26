import { getContribution } from "./dynamo.helpers";
import { validateGetContributionParams } from "./validateParams";

export const handler = async (event: any) => {
  /**
   * POST /contributions/get
   */
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const paramsValidation = validateGetContributionParams(params);
    if (!paramsValidation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: paramsValidation.error.flatten().fieldErrors,
        }),
      };
    }

    const contribution = await getContribution(paramsValidation.data.id);
    if (!contribution) {
      return { statusCode: 404, body: JSON.stringify({ error: "Contribution not found" }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ contribution }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
