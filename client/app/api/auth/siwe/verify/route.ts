import { NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import {
  clearCookieOptions,
  createSessionCookieValue,
  getCookieOptions,
  readNonceFromRequest,
  SIWE_NONCE_COOKIE,
  SIWE_SESSION_COOKIE,
} from "@/app/lib/siwe/session";
import { apiGatewayPost } from "@/app/features/contribute/v1/api/apiGateway";

type VerifyBody = {
  message?: string;
  signature?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyBody;
    if (!body.message || !body.signature) {
      return new Response("message and signature required", { status: 400 });
    }

    const nonce = await readNonceFromRequest(request);
    if (!nonce) {
      return new Response("SIWE nonce missing or expired", { status: 401 });
    }

    const message = new SiweMessage(body.message);
    const requestUrl = new URL(request.url);
    const result = await message.verify({
      signature: body.signature,
      domain: requestUrl.host,
      nonce,
      time: new Date().toISOString(),
    });

    if (!result.success) {
      return new Response("Invalid SIWE message", { status: 401 });
    }

    const verifiedAddress = message.address.toLowerCase();

    // Fire-and-forget: grant WALLET_CONNECT reward. The backend enforces one-time
    // idempotency via a DynamoDB conditional write, so this is safe to call on
    // every sign-in — subsequent attempts are silently ignored.
    apiGatewayPost("/rewards/trigger", {
      wallet_address: verifiedAddress,
      action_type: "WALLET_CONNECT",
      action_context: null,
    }).catch((err) => {
      // Non-fatal — reward grant failures are logged but don't block sign-in
      console.error("[SIWE verify] WALLET_CONNECT reward trigger failed:", err);
    });

    const response = NextResponse.json({
      ok: true,
      session: {
        address: verifiedAddress,
        chainId: message.chainId,
      },
    });

    response.cookies.set(
      SIWE_SESSION_COOKIE,
      await createSessionCookieValue({
        address: message.address,
        chainId: message.chainId,
      }),
      getCookieOptions(request, 7 * 24 * 60 * 60)
    );
    response.cookies.set(SIWE_NONCE_COOKIE, "", clearCookieOptions(request));

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(message, { status: 400 });
  }
}