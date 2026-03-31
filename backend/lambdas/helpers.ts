export const MILLIS_IN = {
  second: 1000,
  minute: 60000,
  hour: 3600000,
  day: 86400000,
  week: 604800000, // 7 days
  month: 2592000000, // 30 days
  year: 31536000000, // 365 days
};

export const MillisToSeconds = (millis: number): number => Math.floor(millis / 1000);

export const SecondsToMillis = (seconds: number): number => seconds * 1000;

/**
 * Returns a 403 response if the contributor does not have an admin role.
 * Returns null if the check passes (caller may proceed).
 */
export const requireAdminRole = async (contributorId: string): Promise<{ statusCode: number; body: string } | null> => {
  const { getContributor } = await import("./dynamo/contributors");
  const contributor = await getContributor(contributorId);
  if (!contributor) {
    return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
  }
  const hasAdmin = contributor.roles.some((r) => r === "ADMIN" || r === "CORE");
  if (!hasAdmin) {
    return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
  }
  return null;
};
