import { apiGatewayPost } from "@/app/features/contribute/v1/api/apiGateway";
import {
  requireAuthenticatedSession,
  requireContributorAdmin,
} from "@/app/features/contribute/v1/api/sessionAuth";

export const runtime = "edge";

export async function POST(request: Request) {
  const bodyText = await request.text();
  try {
    const { address } = await requireAuthenticatedSession(request);
    await requireContributorAdmin(address);

    const body = bodyText ? (JSON.parse(bodyText) as { id?: string }) : {};
    if (!body.id) return new Response("id required", { status: 400 });

    const result = await apiGatewayPost("/features/complete", {
      id: body.id,
      completed_by_id: address.toLowerCase(),
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    let status = 400;
    if (message.includes("Admin role required")) {
      status = 403;
    } else if (message.includes("Authentication required")) {
      status = 401;
    } else if (message.includes("already completed")) {
      status = 409;
    } else if (message.includes("not found")) {
      status = 404;
    }
    return new Response(message, { status });
  }
}