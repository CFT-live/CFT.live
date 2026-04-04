import { apiGatewayPost } from "@/app/features/contribute/v1/api/apiGateway";
import { requireAuthenticatedSession } from "@/app/features/contribute/v1/api/sessionAuth";

export async function POST(request: Request) {
  try {
    const { address } = await requireAuthenticatedSession(request);
    const body = await request.json().catch(() => ({})) as {
      question_id?: string;
      answer?: string;
    };

    if (!body.question_id || !body.answer) {
      return new Response("question_id and answer required", { status: 400 });
    }

    const result = await apiGatewayPost("/rewards/questions/answer", {
      question_id: body.question_id,
      answer: body.answer,
      wallet_address: address,
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
