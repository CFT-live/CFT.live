import { apiGatewayPost } from "@/app/features/contribute/v1/api/apiGateway";
import { requireSignedRequest } from "@/app/features/contribute/v1/api/web3Auth";
import type {
  Contributor,
  ContributorStatus,
  TeamRole,
} from "@/app/features/contribute/v1/api/types";

export const runtime = "edge";

async function isAdmin(address: string): Promise<boolean> {
  try {
    const res = await apiGatewayPost<{ contributor: Contributor }>(
      "/contributors/get",
      { id: address.toLowerCase() }
    );
    const roles = res.contributor.roles ?? [];
    return roles.includes("CORE") || roles.includes("ADMIN");
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const bodyText = await request.text();

  try {
    const { address } = await requireSignedRequest({ request, rawBodyText: bodyText });
    const body = bodyText
      ? (JSON.parse(bodyText) as {
          wallet_address?: string;
          username?: string;
          email?: string | null;
          github_username?: string | null;
          telegram_handle?: string | null;
          bio?: string | null;
          profile_image_url?: string | null;
          roles?: TeamRole[];
          status?: ContributorStatus;
        })
      : {};

    const signer = address.toLowerCase();
    const target = (body.wallet_address ?? signer).toLowerCase();

    const admin = await isAdmin(address);
    if (target !== signer && !admin) {
      return new Response("Admin role required", { status: 403 });
    }

    const username = (body.username ?? "").trim();
    if (!username) return new Response("username required", { status: 400 });

    const payload: Record<string, unknown> = {
      wallet_address: target,
      username,
      email: body.email ?? null,
      github_username: body.github_username ?? null,
      telegram_handle: body.telegram_handle ?? null,
      bio: body.bio ?? null,
      profile_image_url: body.profile_image_url ?? null,
    };

    // Admin-only fields
    if (admin) {
      if (Array.isArray(body.roles)) payload.roles = body.roles;
      if (body.status) payload.status = body.status;
    }

    const result = await apiGatewayPost<{ contributor: Contributor }>(
      "/contributors/update",
      payload
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("Missing wallet signature") ? 401 : 400;
    return new Response(message, { status });
  }
}
