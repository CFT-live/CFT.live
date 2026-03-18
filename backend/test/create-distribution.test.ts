jest.mock("../lambdas/dynamo/dynamo.helpers", () => ({
  getCompletedFeature: jest.fn(),
  getFeature: jest.fn(),
  listDistributions: jest.fn(),
  upsertDistribution: jest.fn(),
}));

import { handler } from "../lambdas/create-distribution";
import {
  getCompletedFeature,
  getFeature,
  listDistributions,
  upsertDistribution,
} from "../lambdas/dynamo/dynamo.helpers";
import type { Feature, FeatureDistribution } from "../lambdas/types";

const mockedGetCompletedFeature = jest.mocked(getCompletedFeature);
const mockedGetFeature = jest.mocked(getFeature);
const mockedListDistributions = jest.mocked(listDistributions);
const mockedUpsertDistribution = jest.mocked(upsertDistribution);

const baseFeature: Feature = {
  id: "feature-1",
  name: "Feature 1",
  description: "desc",
  category: "TECH",
  total_tokens_reward: 100,
  status: "OPEN",
  created_by_id: "0xadmin",
  created_date: "2026-03-18T00:00:00.000Z",
  discussions_url: null,
};

const basePayload = {
  feature_id: "feature-1",
  task_id: "task-1",
  contribution_id: "contribution-1",
  payout_key: "0xpayoutkey",
  contributor_id: "0xcontributor",
  cp_amount: 10,
  token_amount: 25,
  token_amount_raw: "25000000000000000000",
  approver_id: "0xadmin",
  transaction_status: "Confirmed" as const,
  arbitrum_tx_hash: "0xtxhash",
};

function buildDistribution(
  overrides: Partial<FeatureDistribution> = {},
): FeatureDistribution {
  return {
    id: "distribution-1",
    feature_id: basePayload.feature_id,
    task_id: basePayload.task_id,
    contribution_id: basePayload.contribution_id,
    payout_key: basePayload.payout_key,
    contributor_id: basePayload.contributor_id,
    cp_amount: basePayload.cp_amount,
    token_amount: basePayload.token_amount,
    token_amount_raw: basePayload.token_amount_raw,
    arbitrum_tx_hash: basePayload.arbitrum_tx_hash,
    distribution_date: "2026-03-18T00:00:00.000Z",
    approver_id: basePayload.approver_id,
    transaction_status: basePayload.transaction_status,
    ...overrides,
  };
}

describe("create-distribution handler", () => {
  beforeEach(() => {
    mockedGetFeature.mockReset();
    mockedGetCompletedFeature.mockReset();
    mockedListDistributions.mockReset();
    mockedUpsertDistribution.mockReset();

    mockedGetFeature.mockResolvedValue(baseFeature);
    mockedGetCompletedFeature.mockResolvedValue(null);
    mockedUpsertDistribution.mockImplementation(async (input) => ({
      ...input,
      distribution_date: "2026-03-18T00:00:00.000Z",
    }));
  });

  it("rejects distribution creation without a payout key", async () => {
    const response = await handler({
      body: JSON.stringify({
        ...basePayload,
        payout_key: undefined,
      }),
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects an existing non-failed contribution payout", async () => {
    mockedListDistributions.mockImplementation(async (filter) => {
      if (filter?.contribution_id === basePayload.contribution_id) {
        return [buildDistribution()];
      }

      return [];
    });

    const response = await handler({
      body: JSON.stringify(basePayload),
    });

    expect(response.statusCode).toBe(409);
    expect(JSON.parse(response.body)).toEqual({
      error: "Contribution payout record already exists",
    });
  });

  it("rejects a payout key already mapped to another contribution", async () => {
    mockedListDistributions.mockImplementation(async (filter) => {
      if (filter?.payout_key === basePayload.payout_key) {
        return [buildDistribution({ contribution_id: "contribution-other" })];
      }

      return [];
    });

    const response = await handler({
      body: JSON.stringify(basePayload),
    });

    expect(response.statusCode).toBe(409);
    expect(JSON.parse(response.body)).toEqual({
      error: "Payout key already belongs to another contribution",
    });
  });

  it("reuses a failed contribution payout record id", async () => {
    mockedListDistributions.mockImplementation(async (filter) => {
      if (filter?.contribution_id === basePayload.contribution_id) {
        return [
          buildDistribution({
            id: "distribution-existing",
            transaction_status: "Failed",
          }),
        ];
      }

      return [];
    });

    const response = await handler({
      body: JSON.stringify(basePayload),
    });

    expect(response.statusCode).toBe(200);
    expect(mockedUpsertDistribution).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "distribution-existing",
        payout_key: basePayload.payout_key,
        contribution_id: basePayload.contribution_id,
      }),
    );
  });
});