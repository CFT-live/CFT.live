import { apiGatewayPost } from "@/app/features/contribute/v1/api/apiGateway";
import { requireAuthenticatedSession } from "@/app/features/contribute/v1/api/sessionAuth";

export async function POST(request: Request) {
  try {
    const { address } = await requireAuthenticatedSession(request);
    const body = await request.json().catch(() => ({})) as {
      action_type?: string;
      action_context?: Record<string, unknown> | null;
    };

    if (!body.action_type) {
      return new Response("action_type required", { status: 400 });
    }

    const result = await apiGatewayPost("/rewards/trigger", {
      wallet_address: address,
      action_type: body.action_type,
      action_context: body.action_context ?? null,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("Authentication required") ? 401
      : message.includes("already granted") ? 409
      : 500;
    return new Response(message, { status });
  }
}
