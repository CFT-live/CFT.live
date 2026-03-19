import { apiGatewayPost } from "@/app/features/contribute/v1/api/apiGateway";

export async function POST(request: Request) {
  try {
    const bodyText = await request.text();
    const body = bodyText ? (JSON.parse(bodyText) as { id?: string }) : {};
    if (!body.id) return new Response("Missing id", { status: 400 });

    const result = await apiGatewayPost<{ contribution: unknown }>(
      "/contributions/get",
      { id: body.id }
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("not found") ? 404 : 500;
    return new Response(message, { status });
  }
}
