import { patchDistributionTx } from "./dynamo.helpers";
import { validateUpdateDistributionTxParams } from "./validateParams";

export const handler = async (event: any) => {
  /**
   * POST /feature-distribution/update
   */
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const paramsValidation = validateUpdateDistributionTxParams(params);
    if (!paramsValidation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: paramsValidation.error.flatten().fieldErrors,
        }),
      };
    }

    const distribution = await patchDistributionTx({
      id: paramsValidation.data.id,
      transaction_status: paramsValidation.data.transaction_status,
      arbitrum_tx_hash: paramsValidation.data.arbitrum_tx_hash,
      approver_id: paramsValidation.data.approver_id,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ distribution }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
