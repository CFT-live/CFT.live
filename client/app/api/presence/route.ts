import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: Request) {
  try {
    const ctx = getCloudflareContext();
    const env = ctx?.env;

    const url = new URL(request.url);
    const peek = url.searchParams.get("peek") === "1";
    const clientId = url.searchParams.get("clientId");

    if (!clientId && !peek) {
      return new Response(
        JSON.stringify({ error: "clientId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Presence is handled by a standalone Worker in /workers.
    // In local dev (wrangler.dev.jsonc), service bindings are intentionally absent.
    if (!env?.PRESENCE_WORKER) {
      return new Response(
        JSON.stringify({
          count: 1,
          timestamp: Date.now(),
          localDev: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const query = new URLSearchParams();
    if (peek) query.set("peek", "1");
    if (clientId) query.set("clientId", clientId);

    const upstream = await env.PRESENCE_WORKER.fetch(
      new Request(`https://presence-worker/presence?${query.toString()}`, {
        method: "GET",
      })
    );

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in presence API:", error);
    return new Response(
      JSON.stringify({
        count: 0,
        timestamp: Date.now(),
        error: String(error),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
