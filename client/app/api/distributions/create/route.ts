import { apiGatewayPost } from "@/app/features/contribute/v1/api/apiGateway";
import { requireSignedRequest } from "@/app/features/contribute/v1/api/web3Auth";
import type { Contributor, Feature } from "@/app/features/contribute/v1/api/types";

export const runtime = "edge";

async function requireAdmin(address: string): Promise<void> {
  const id = address.toLowerCase();
  const res = await apiGatewayPost<{ contributor: Contributor }>("/contributors/get", { id });
  const roles = res.contributor.roles ?? [];
  const ok = roles.includes("CORE") || roles.includes("ADMIN");
  if (!ok) throw new Error("Admin role required");
}

export async function POST(request: Request) {
  const bodyText = await request.text();
  try {
    const { address } = await requireSignedRequest({ request, rawBodyText: bodyText });
    await requireAdmin(address);

    const body = bodyText ? (JSON.parse(bodyText) as Record<string, unknown>) : {};

    const featureId = typeof body.feature_id === "string" ? body.feature_id : "";
    if (!featureId) return new Response("feature_id required", { status: 400 });

    const featureRes = await apiGatewayPost<{ feature: Feature }>("/features/get", {
      id: featureId,
    });
    if (featureRes.feature.status !== "COMPLETED") {
      return new Response("Feature must be COMPLETED before creating distributions", {
        status: 409,
      });
    }

    const result = await apiGatewayPost("/distributions/create", {
      ...body,
      approver_id: address.toLowerCase(),
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("Admin role required")
      ? 403
      : message.includes("Missing wallet signature")
        ? 401
        : 400;
    return new Response(message, { status });
  }
}
