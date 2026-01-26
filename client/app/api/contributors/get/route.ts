import { apiGatewayPost } from "@/app/features/contribute/v1/api/apiGateway";
import { requireSignedRequest } from "@/app/features/contribute/v1/api/web3Auth";
import type { Contributor } from "@/app/features/contribute/v1/api/types";

export const runtime = "edge";

async function isAdmin(address: string): Promise<boolean> {
  try {
    const res = await apiGatewayPost<{ contributor: Contributor }>(
      "/contributors/get",
      { id: address.toLowerCase() }
    );
    const roles = res.contributor.roles ?? [];
    return roles.includes("CORE") || roles.includes("ADMIN");
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const bodyText = await request.text();

  try {
    const { address } = await requireSignedRequest({ request, rawBodyText: bodyText });
    const body = bodyText ? (JSON.parse(bodyText) as { id?: string }) : {};

    const targetId = (body.id ?? address).toLowerCase();
    if (targetId !== address.toLowerCase()) {
      const ok = await isAdmin(address);
      if (!ok) return new Response("Admin role required", { status: 403 });
    }

    const result = await apiGatewayPost<{ contributor: Contributor }>(
      "/contributors/get",
      { id: targetId }
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("Missing wallet signature") ? 401 : 400;
    return new Response(message, { status });
  }
}
