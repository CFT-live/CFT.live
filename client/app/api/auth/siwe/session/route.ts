import { NextResponse } from "next/server";
import { readSessionFromRequest } from "@/app/lib/siwe/session";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const session = await readSessionFromRequest(request);
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(message, { status: 500 });
  }
}