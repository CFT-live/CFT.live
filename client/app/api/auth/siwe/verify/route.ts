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

    const response = NextResponse.json({
      ok: true,
      session: {
        address: message.address.toLowerCase(),
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