import {
  GetCommand,
  GetCommandInput,
  GetCommandOutput,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Contributor, ContributorStatus, TeamRole } from "../types";
import { docClient, normalizeWalletAddress, nowIso } from "./shared";

const normalizeTeamRoles = (record: any): TeamRole[] => {
  const roles = record?.roles;
  if (Array.isArray(roles)) {
    return Array.from(new Set(roles)).filter(Boolean);
  }
  return [];
};

const normalizeContributorRecord = (record: any): Contributor => ({
  ...(record as Contributor),
  roles: normalizeTeamRoles(record),
});

export const getContributor = async (id: string): Promise<Contributor | null> => {
  if (!id) return null;

  const params: GetCommandInput = {
    TableName: process.env.CONTRIBUTORS_TABLE_NAME!,
    Key: { id },
  };

  try {
    const data: GetCommandOutput = await docClient.send(new GetCommand(params));
    const item = data.Item as any;
    return item ? normalizeContributorRecord(item) : null;
  } catch (error) {
    console.error(`Error fetching contributor for key: ${id}`, error);
    throw error;
  }
};

export const putContributor = async (contributor: Contributor): Promise<Contributor> => {
  const params = {
    TableName: process.env.CONTRIBUTORS_TABLE_NAME!,
    Item: contributor,
  };

  try {
    await docClient.send(new PutCommand(params));
    return contributor;
  } catch (error) {
    console.error(`Error saving contributor for key: ${contributor.id}`, error);
    throw error;
  }
};

export const touchContributorLastActive = async (contributorId: string): Promise<void> => {
  try {
    const contributor = await getContributor(contributorId);
    if (!contributor) return;
    await putContributor({
      ...contributor,
      last_active_date: nowIso(),
    });
  } catch (err) {
    console.warn("Failed to touch contributor last_active_date", err);
  }
};

export const getContributorByWalletAddress = async (
  walletAddress: string
): Promise<Contributor | null> => {
  const wallet_address = normalizeWalletAddress(walletAddress);
  if (!wallet_address) return null;

  const TableName = process.env.CONTRIBUTORS_TABLE_NAME!;
  try {
    const resp = await docClient.send(
      new QueryCommand({
        TableName,
        IndexName: "wallet_address-index",
        KeyConditionExpression: "wallet_address = :wa",
        ExpressionAttributeValues: {
          ":wa": wallet_address,
        },
        Limit: 1,
      })
    );

    const item = (resp.Items ?? [])[0] as any;
    return item ? normalizeContributorRecord(item) : null;
  } catch (error) {
    console.error(
      `Error fetching contributor for wallet_address: ${wallet_address}`,
      error
    );
    throw error;
  }
};

export const listContributors = async (filter?: {
  status?: ContributorStatus;
  roles?: TeamRole[];
  q?: string;
}): Promise<Contributor[]> => {
  const TableName = process.env.CONTRIBUTORS_TABLE_NAME!;
  try {
    let items: any[] = [];
    if (filter?.status) {
      const resp = await docClient.send(
        new QueryCommand({
          TableName,
          IndexName: "status-index",
          KeyConditionExpression: "#status = :status",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":status": filter.status },
        })
      );
      items = resp.Items ?? [];
    } else {
      const resp = await docClient.send(new ScanCommand({ TableName }));
      items = resp.Items ?? [];
    }

    const normalized = items.map(normalizeContributorRecord);
    const q = (filter?.q ?? "").trim().toLowerCase();

    return normalized.filter((contributor) => {
      if (filter?.roles?.length) {
        const allowed = new Set(filter.roles);
        if (!contributor.roles.some((role) => allowed.has(role))) return false;
      }

      if (q) {
        const haystack = `${contributor.username} ${contributor.wallet_address} ${contributor.github_username ?? ""} ${contributor.telegram_handle ?? ""}`
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  } catch (error) {
    console.error("Error listing contributors", error);
    throw error;
  }
};

export const upsertContributor = async (input: {
  wallet_address: string;
  username: string;
  email: string | null;
  github_username: string | null;
  telegram_handle: string | null;
  bio: string | null;
  profile_image_url: string | null;
  roles?: TeamRole[];
  status?: ContributorStatus;
}): Promise<Contributor> => {
  const wallet_address = normalizeWalletAddress(input.wallet_address);
  if (!wallet_address) {
    throw new Error("wallet_address is required");
  }

  const existingByWallet = await getContributorByWalletAddress(wallet_address);
  const id = existingByWallet?.id ?? wallet_address;
  const existing = existingByWallet ?? (await getContributor(id));
  const now = nowIso();

  const contributor: Contributor = {
    id,
    wallet_address,
    username: input.username,
    email: input.email,
    github_username: input.github_username,
    telegram_handle: input.telegram_handle,
    bio: input.bio,
    profile_image_url: input.profile_image_url,
    roles: Array.from(new Set(input.roles ?? existing?.roles ?? [])),
    total_tokens_earned: existing?.total_tokens_earned ?? 0,
    total_features_contributed: existing?.total_features_contributed ?? 0,
    total_tasks_completed: existing?.total_tasks_completed ?? 0,
    created_date: existing?.created_date ?? now,
    last_active_date: now,
    status: input.status ?? existing?.status ?? "ACTIVE",
  };

  return putContributor(contributor);
};