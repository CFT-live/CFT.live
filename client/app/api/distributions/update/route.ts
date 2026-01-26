import { apiGatewayPost } from "@/app/features/contribute/v1/api/apiGateway";
import { requireSignedRequest } from "@/app/features/contribute/v1/api/web3Auth";
import type { Contributor } from "@/app/features/contribute/v1/api/types";

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
    const result = await apiGatewayPost("/distributions/update", {
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
