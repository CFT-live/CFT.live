import { randomUUID } from "node:crypto";
import { getCompletedFeature, getFeature, listDistributions, upsertDistribution } from "./dynamo/dynamo.helpers";
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

    const feature =
      (await getFeature(paramsValidation.data.feature_id)) ??
      (await getCompletedFeature(paramsValidation.data.feature_id));
    if (!feature) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Feature not found" }),
      };
    }

    const existingForContribution = await listDistributions({
      contribution_id: paramsValidation.data.contribution_id,
    });
    if (existingForContribution.length > 1) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "Multiple payout records found for contribution" }),
      };
    }

    const existingForPayoutKey = await listDistributions({
      payout_key: paramsValidation.data.payout_key,
    });
    if (existingForPayoutKey.length > 1) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "Multiple payout records found for payout key" }),
      };
    }

    const existingByContribution = existingForContribution[0] ?? null;
    const existingByPayoutKey = existingForPayoutKey[0] ?? null;

    if (
      existingByContribution?.payout_key &&
      existingByContribution.payout_key !== paramsValidation.data.payout_key
    ) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "Contribution payout key does not match existing payout record" }),
      };
    }

    if (
      existingByPayoutKey &&
      existingByPayoutKey.contribution_id !== paramsValidation.data.contribution_id
    ) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "Payout key already belongs to another contribution" }),
      };
    }

    const existing = existingByContribution ?? existingByPayoutKey;
    if (
      existing &&
      existing.transaction_status !== "Failed"
    ) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "Contribution payout record already exists" }),
      };
    }

    const id = existing?.id ?? randomUUID();

    const distribution = await upsertDistribution({
      id,
      feature_id: paramsValidation.data.feature_id,
      task_id: paramsValidation.data.task_id,
      contribution_id: paramsValidation.data.contribution_id,
      payout_key: paramsValidation.data.payout_key,
      contributor_id: paramsValidation.data.contributor_id,
      cp_amount: paramsValidation.data.cp_amount,
      token_amount: paramsValidation.data.token_amount,
      token_amount_raw: paramsValidation.data.token_amount_raw,
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
