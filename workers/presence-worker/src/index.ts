/**
 * CFT Presence Worker
 *
 * Tracks the number of "online" users by counting unique client IDs that
 * ping within a time window (stored in a Durable Object).
 *
 * Endpoints:
 * - GET /presence?clientId=... -> { count, timestamp }
 * - GET /health -> { status: "ok" }
 */

export { UserPresence } from "./userPresence";
export type { Env } from "./userPresence";

import type { Env } from "./userPresence";

function getPresence(env: Env): DurableObjectStub {
	const id = env.USER_PRESENCE.idFromName("global");
	return env.USER_PRESENCE.get(id);
}

function isOriginAllowed(origin: string | null, env: Env): boolean {
	if (!origin) return false;
	const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
	return allowedOrigins.includes(origin);
}

function getCorsHeaders(origin: string | null, env: Env): HeadersInit {
	const headers: HeadersInit = {
		"Content-Type": "application/json",
	};

	if (origin && isOriginAllowed(origin, env)) {
		headers["Access-Control-Allow-Origin"] = origin;
		headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
		headers["Access-Control-Allow-Headers"] = "Content-Type";
		headers["Access-Control-Max-Age"] = "86400";
	}

	return headers;
}

const worker = {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const origin = request.headers.get("Origin");

		// Handle CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: getCorsHeaders(origin, env),
			});
		}

		if (request.method !== "GET") {
			return new Response(JSON.stringify({ error: "Method not allowed" }), {
				status: 405,
				headers: getCorsHeaders(origin, env),
			});
		}

		if (url.pathname === "/health") {
			return new Response(JSON.stringify({ status: "ok" }), {
				headers: getCorsHeaders(origin, env),
			});
		}

		if (url.pathname === "/presence") {
			const peek = url.searchParams.get("peek") === "1";
			const clientId = url.searchParams.get("clientId");

			if (!clientId && !peek) {
				return new Response(JSON.stringify({ error: "clientId is required" }), {
					status: 400,
					headers: getCorsHeaders(origin, env),
				});
			}

			try {
				const presence = getPresence(env);
				const query = new URLSearchParams();
				if (peek) query.set("peek", "1");
				if (clientId) query.set("clientId", clientId);
				const response = await presence.fetch(
					new Request(`https://presence/?${query.toString()}`, {
						method: "GET",
					})
				);

				const body = await response.text();
				return new Response(body, {
					status: response.status,
					headers: getCorsHeaders(origin, env),
				});
			} catch (error) {
				console.error("[Presence Worker] Error:", error);
				return new Response(
					JSON.stringify({ count: 0, timestamp: Date.now(), error: String(error) }),
					{ status: 200, headers: getCorsHeaders(origin, env) }
				);
			}
		}

		return new Response(JSON.stringify({ error: "Not Found" }), {
			status: 404,
			headers: getCorsHeaders(origin, env),
		});
	},
};

export default worker;
