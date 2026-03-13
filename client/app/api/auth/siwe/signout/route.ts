import { NextResponse } from "next/server";
import {
  clearCookieOptions,
  SIWE_NONCE_COOKIE,
  SIWE_SESSION_COOKIE,
} from "@/app/lib/siwe/session";

export const runtime = "edge";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SIWE_SESSION_COOKIE, "", clearCookieOptions(request));
  response.cookies.set(SIWE_NONCE_COOKIE, "", clearCookieOptions(request));
  return response;
}