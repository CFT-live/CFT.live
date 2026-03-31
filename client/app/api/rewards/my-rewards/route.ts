import { apiGatewayPost } from "@/app/features/contribute/v1/api/apiGateway";
import { requireAuthenticatedSession } from "@/app/features/contribute/v1/api/sessionAuth";

export async function POST(request: Request) {
  try {
    const { address } = await requireAuthenticatedSession(request);
    const result = await apiGatewayPost("/rewards/my-rewards", {
      wallet_address: address,
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("Authentication required") ? 401 : 500;
    return new Response(message, { status });
  }
}
