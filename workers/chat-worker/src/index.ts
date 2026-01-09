/**
 * CFT Chat Worker
 *
 * A Cloudflare Worker that provides chat functionality with message persistence.
 * Uses a Durable Object to store the last 100 messages.
 *
 * Endpoints:
 * - GET /messages - Fetch all messages
 * - POST /messages - Send a new message (requires address and content in body)
 * - GET /health - Health check
 */

export { Chat } from "./chat";
export type { Env, MessageRole } from "./chat";
import type { Env, MessageRole } from "./chat";

const SYSTEM_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Get the singleton Chat Durable Object instance
 */
function getChat(env: Env): DurableObjectStub {
	// Use a fixed ID for singleton behavior (global chat room)
	const id = env.CHAT.idFromName("global");
	return env.CHAT.get(id);
}

/**
 * Check if the origin is allowed for CORS
 */
function isOriginAllowed(origin: string | null, env: Env): boolean {
	if (!origin) return false;
	const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
	return allowedOrigins.includes(origin);
}

/**
 * Create CORS headers for response
 */
function getCorsHeaders(origin: string | null, env: Env): HeadersInit {
	const headers: HeadersInit = {
		"Content-Type": "application/json",
	};

	if (origin && isOriginAllowed(origin, env)) {
		headers["Access-Control-Allow-Origin"] = origin;
		headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS";
		headers["Access-Control-Allow-Headers"] = "Content-Type, X-Admin-Address";
		headers["Access-Control-Max-Age"] = "86400";
	}

	return headers;
}

const worker = {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		const url = new URL(request.url);
		const origin = request.headers.get("Origin");

		// Handle CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: getCorsHeaders(origin, env),
			});
		}

		// Health check endpoint
		if (url.pathname === "/health") {
			return new Response(JSON.stringify({ status: "ok" }), {
				headers: getCorsHeaders(origin, env),
			});
		}

		// Messages endpoints
		if (url.pathname === "/messages") {
			try {
				const chat = getChat(env);

				if (request.method === "GET") {
					const response = await chat.fetch(
						new Request("https://chat/messages", { method: "GET" })
					);
					const data: { messages?: unknown[] } = await response.json();

					return new Response(JSON.stringify(data), {
						status: response.status,
						headers: getCorsHeaders(origin, env),
					});
				}

				if (request.method === "POST") {
					const bodyText = await request.text();
					const body: { address?: string; content?: string } = JSON.parse(bodyText);
					
					// Determine role based on address
					let role: MessageRole = "USER";
					if (body.address?.toLowerCase() === SYSTEM_ADDRESS.toLowerCase()) {
						role = "SYSTEM";
					} else if (env.ADMIN_ADDRESS && body.address?.toLowerCase() === env.ADMIN_ADDRESS.toLowerCase()) {
						role = "ADMIN";
					}

					const response = await chat.fetch(
						new Request("https://chat/messages", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ ...body, role }),
						})
					);
					const data = await response.json();

					return new Response(JSON.stringify(data), {
						status: response.status,
						headers: getCorsHeaders(origin, env),
					});
				}

				if (request.method === "DELETE") {
					// Verify admin authorization
					const adminHeader = request.headers.get("X-Admin-Address");
					if (
						!adminHeader ||
						!env.ADMIN_ADDRESS ||
						adminHeader.toLowerCase() !== env.ADMIN_ADDRESS.toLowerCase()
					) {
						return new Response(
							JSON.stringify({ error: "Unauthorized" }),
							{
								status: 403,
								headers: getCorsHeaders(origin, env),
							}
						);
					}

					const body = await request.text();

					const response = await chat.fetch(
						new Request("https://chat/messages", {
							method: "DELETE",
							headers: { "Content-Type": "application/json" },
							body,
						})
					);
					const data = await response.json();

					return new Response(JSON.stringify(data), {
						status: response.status,
						headers: getCorsHeaders(origin, env),
					});
				}

				return new Response(
					JSON.stringify({ error: "Method not allowed" }),
					{
						status: 405,
						headers: getCorsHeaders(origin, env),
					}
				);
			} catch (error) {
				console.error("[Chat Worker] Error:", error);
				return new Response(
					JSON.stringify({ error: "Internal server error" }),
					{
						status: 500,
						headers: getCorsHeaders(origin, env),
					}
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
