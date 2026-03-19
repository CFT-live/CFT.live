import { NextResponse } from "next/server";
import {
  createSiweNonce,
  createNonceCookieValue,
  getCookieOptions,
  SIWE_NONCE_COOKIE,
} from "@/app/lib/siwe/session";

export async function GET(request: Request) {
  try {
    const nonce = createSiweNonce();
    const response = NextResponse.json({ nonce });
    response.cookies.set(
      SIWE_NONCE_COOKIE,
      await createNonceCookieValue(nonce),
      getCookieOptions(request, 10 * 60)
    );

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(message, { status: 500 });
  }
}