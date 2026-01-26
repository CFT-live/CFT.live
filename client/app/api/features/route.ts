import { apiGatewayPost } from "@/app/features/contribute/v1/api/apiGateway";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const bodyText = await request.text();
    const body = bodyText ? (JSON.parse(bodyText) as unknown) : {};

    const result = await apiGatewayPost<{ features: unknown[] }>("/features", body);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(message, { status: 500 });
  }
}
