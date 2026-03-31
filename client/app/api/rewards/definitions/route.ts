import { apiGatewayPost } from "@/app/features/contribute/v1/api/apiGateway";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await apiGatewayPost("/rewards/definitions", body);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(message, { status: 500 });
  }
}
