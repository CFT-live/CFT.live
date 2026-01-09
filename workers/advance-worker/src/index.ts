/**
 * CFT Advance Worker
 *
 * This Cloudflare Worker uses Durable Objects with Alarms to call the advance
 * API endpoint at precise times. The cron trigger runs every minute as a
 * fallback to ensure the Durable Object scheduler is always active.
 *
 * Architecture:
 * - AdvanceScheduler (Durable Object): Manages precise scheduling using alarms
 * - Cron trigger: Fallback mechanism to bootstrap/verify scheduler is active
 * - HTTP endpoints: Manual trigger, status checks, and health monitoring
 */

export { AdvanceScheduler } from "./scheduler";

export interface Env {
	ADVANCE_API_KEY: string;
	API_BASE_URL: string;
	ADVANCE_SCHEDULER: DurableObjectNamespace;
}

/**
 * Get the singleton scheduler Durable Object instance
 */
function getScheduler(env: Env): DurableObjectStub {
	// Use a fixed ID for singleton behavior
	const id = env.ADVANCE_SCHEDULER.idFromName("scheduler");
	return env.ADVANCE_SCHEDULER.get(id);
}

const worker = {
	/**
	 * Cron trigger handler - runs every minute as a fallback
	 * Ensures the Durable Object scheduler is active and has an alarm set
	 */
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		console.log(`[Worker] Cron triggered at ${new Date().toISOString()}`);

		try {
			const scheduler = getScheduler(env);
			const response = await scheduler.fetch(
				new Request("https://scheduler/ensure")
			);
			const result = await response.json();
			console.log("[Worker] Scheduler ensure result:", JSON.stringify(result));
		} catch (error) {
			console.error("[Worker] Error ensuring scheduler:", error);
		}
	},

	/**
	 * HTTP handler for external requests
	 */
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		const url = new URL(request.url);

		// Health check endpoint
		if (url.pathname === "/health") {
			return new Response(JSON.stringify({ status: "ok" }), {
				headers: { "Content-Type": "application/json" },
			});
		}

		// Manual trigger endpoint (requires API key)
		if (url.pathname === "/trigger") {
			const apiKey = request.headers.get("x-api-key");
			if (!apiKey || apiKey !== env.ADVANCE_API_KEY) {
				return new Response(JSON.stringify({ error: "Unauthorized" }), {
					status: 401,
					headers: { "Content-Type": "application/json" },
				});
			}

			try {
				const scheduler = getScheduler(env);
				const response = await scheduler.fetch(
					new Request("https://scheduler/trigger")
				);
				return new Response(response.body, {
					status: response.status,
					headers: { "Content-Type": "application/json" },
				});
			} catch (error) {
				console.error("[Worker] Error triggering scheduler:", error);
				return new Response(
					JSON.stringify({ error: "Failed to trigger scheduler" }),
					{ status: 500, headers: { "Content-Type": "application/json" } }
				);
			}
		}

		// Status endpoint - shows scheduler state
		if (url.pathname === "/status") {
			try {
				const scheduler = getScheduler(env);
				const response = await scheduler.fetch(
					new Request("https://scheduler/status")
				);
				return new Response(response.body, {
					status: response.status,
					headers: { "Content-Type": "application/json" },
				});
			} catch (error) {
				console.error("[Worker] Error getting scheduler status:", error);
				return new Response(
					JSON.stringify({ error: "Failed to get scheduler status" }),
					{ status: 500, headers: { "Content-Type": "application/json" } }
				);
			}
		}

		// Reset endpoint (requires API key) - resets scheduler state
		if (url.pathname === "/reset") {
			const apiKey = request.headers.get("x-api-key");
			if (!apiKey || apiKey !== env.ADVANCE_API_KEY) {
				return new Response(JSON.stringify({ error: "Unauthorized" }), {
					status: 401,
					headers: { "Content-Type": "application/json" },
				});
			}

			try {
				const scheduler = getScheduler(env);
				const response = await scheduler.fetch(
					new Request("https://scheduler/reset")
				);
				return new Response(response.body, {
					status: response.status,
					headers: { "Content-Type": "application/json" },
				});
			} catch (error) {
				console.error("[Worker] Error resetting scheduler:", error);
				return new Response(
					JSON.stringify({ error: "Failed to reset scheduler" }),
					{ status: 500, headers: { "Content-Type": "application/json" } }
				);
			}
		}

		return new Response("Not Found", { status: 404 });
	},
};

export default worker;