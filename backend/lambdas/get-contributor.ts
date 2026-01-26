import { getContributor, getContributorByWalletAddress } from "./dynamo.helpers";
import { validateGetContributorParams } from "./validateParams";

export const handler = async (event: any) => {
  /**
   * POST /contributors/get
   * - Get contributor profile by id OR wallet_address
   * - Request body: { id?: string; wallet_address?: string }
   */
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const paramsValidation = validateGetContributorParams(params);
    if (!paramsValidation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: paramsValidation.error.flatten().fieldErrors,
        }),
      };
    }

    const contributor = paramsValidation.data.wallet_address
      ? await getContributorByWalletAddress(paramsValidation.data.wallet_address)
      : await getContributor(paramsValidation.data.id!);
    if (!contributor) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Contributor not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ contributor }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify(err),
    };
  }
};
