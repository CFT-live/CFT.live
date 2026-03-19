import { apiGatewayPost } from "@/app/features/contribute/v1/api/apiGateway";
import {
  isContributorAdmin,
  requireAuthenticatedSession,
} from "@/app/features/contribute/v1/api/sessionAuth";
import type { Contributor } from "@/app/features/contribute/v1/api/types";

export async function POST(request: Request) {
  const bodyText = await request.text();

  try {
    const { address } = await requireAuthenticatedSession(request);
    const body = bodyText ? (JSON.parse(bodyText) as { id?: string }) : {};

    const targetId = (body.id ?? address).toLowerCase();
    if (targetId !== address.toLowerCase()) {
      const ok = await isContributorAdmin(address);
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
    const status = message.includes("Authentication required") ? 401 : 400;
    return new Response(message, { status });
  }
}
