import { apiGatewayPost } from "@/app/features/contribute/v1/api/apiGateway";
import { requireAuthenticatedSession } from "@/app/features/contribute/v1/api/sessionAuth";

export const runtime = "edge";

export async function POST(request: Request) {
  const bodyText = await request.text();
  try {
    const { address } = await requireAuthenticatedSession(request);
    const signer = address.toLowerCase();

    // Never accept contributor_id from the client. Contributor identity is derived
    // from the signed request (wallet address).
    const payload = bodyText ? (JSON.parse(bodyText) as Record<string, unknown>) : {};
    if (payload.contributor_id !== undefined) {
      delete payload.contributor_id;
    }
    const result = await apiGatewayPost("/contributions/submit", {
      ...payload,
      contributor_id: signer,
    });

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
