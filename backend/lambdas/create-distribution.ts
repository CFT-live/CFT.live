import { randomUUID } from "crypto";
import { getFeature, upsertDistribution } from "./dynamo.helpers";
import { validateUpsertDistributionParams } from "./validateParams";

export const handler = async (event: any) => {
  /**
   * POST /feature-distribution/create
   */
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const paramsValidation = validateUpsertDistributionParams(params);
    if (!paramsValidation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: paramsValidation.error.flatten().fieldErrors,
        }),
      };
    }

    const id = randomUUID();

    const feature = await getFeature(paramsValidation.data.feature_id);
    if (!feature) {
      return { statusCode: 404, body: JSON.stringify({ error: "Feature not found" }) };
    }
    if (feature.status !== "COMPLETED") {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "Feature must be COMPLETED before creating distributions" }),
      };
    }

    const distribution = await upsertDistribution({
      id,
      feature_id: paramsValidation.data.feature_id,
      contributor_id: paramsValidation.data.contributor_id,
      cp_amount: paramsValidation.data.cp_amount,
      token_amount: paramsValidation.data.token_amount,
      arbitrum_tx_hash: paramsValidation.data.arbitrum_tx_hash,
      approver_id: paramsValidation.data.approver_id,
      transaction_status: paramsValidation.data.transaction_status,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ distribution }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
