import { apiGatewayPost } from "@/app/features/contribute/v1/api/apiGateway";
import { requireSignedRequest } from "@/app/features/contribute/v1/api/web3Auth";

export const runtime = "edge";

export async function POST(request: Request) {
  const bodyText = await request.text();
  try {
    const { address } = await requireSignedRequest({ request, rawBodyText: bodyText });
    const body = bodyText
      ? (JSON.parse(bodyText) as { task_id?: string; action?: "CLAIM" | "UNCLAIM" })
      : {};

    if (!body.task_id) return new Response("task_id required", { status: 400 });

    const action = body.action ?? "CLAIM";
    const result = await apiGatewayPost<{ task: unknown }>("/tasks/claim", {
      task_id: body.task_id,
      action,
      claimed_by_id: address.toLowerCase(),
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("Missing wallet signature")
      ? 401
      : message.includes("Only the current claimant")
        ? 403
        : message.includes("already claimed") || message.includes("not open")
          ? 409
          : 400;
    return new Response(message, { status });
  }
}
