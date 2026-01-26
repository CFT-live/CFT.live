import { apiGatewayPost } from "@/app/features/contribute/v1/api/apiGateway";
import type { Contributor } from "@/app/features/contribute/v1/api/types";

export const runtime = "edge";

type PublicContributor = Pick<
  Contributor,
  "id" | "wallet_address" | "username" | "github_username" | "telegram_handle" | "roles" | "status"
>;

function toPublicContributor(c: Contributor): PublicContributor {
  return {
    id: c.id,
    wallet_address: c.wallet_address,
    username: c.username,
    github_username: c.github_username,
    telegram_handle: c.telegram_handle,
    roles: c.roles,
    status: c.status,
  };
}

export async function POST(request: Request) {
  try {
    const bodyText = await request.text();
    const body = bodyText
      ? (JSON.parse(bodyText) as { id?: string; wallet_address?: string })
      : {};

    const id = (body.id ?? body.wallet_address)?.toLowerCase();
    if (!id) return new Response("id or wallet_address required", { status: 400 });

    const result = await apiGatewayPost<{ contributor: Contributor }>(
      "/contributors/get",
      { id }
    );

    return new Response(JSON.stringify({ contributor: toPublicContributor(result.contributor) }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("not found") ? 404 : 500;
    return new Response(message, { status });
  }
}
