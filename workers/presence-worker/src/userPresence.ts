import { DurableObject } from "cloudflare:workers";

// Configuration - how long a user is considered "active" after their last ping
const ACTIVITY_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Cleanup every 5 minutes

const USER_KEY_PREFIX = "u:";

export interface Env {
	USER_PRESENCE: DurableObjectNamespace;
	ALLOWED_ORIGINS: string;
}

/**
 * Simple presence tracker that counts unique users active within a time window.
 * Users are identified by a client-generated UUID stored in localStorage.
 */
export class UserPresence extends DurableObject {
	// Map of clientId -> lastSeen timestamp
	private readonly activeUsers: Map<string, number>;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.activeUsers = new Map();

		// Load persisted users into memory. Durable Object instances can be evicted;
		// using storage ensures counts survive across restarts.
		this.ctx.blockConcurrencyWhile(async () => {
			const stored = await this.ctx.storage.list<number>({ prefix: USER_KEY_PREFIX });
			for (const [key, lastSeen] of stored) {
				if (typeof lastSeen !== "number") continue;
				const clientId = key.slice(USER_KEY_PREFIX.length);
				if (!clientId) continue;
				this.activeUsers.set(clientId, lastSeen);
			}
			await this.cleanupInactiveUsers();
		});

		// Schedule cleanup alarm
		this.ctx.waitUntil(this.ctx.storage.setAlarm(Date.now() + CLEANUP_INTERVAL_MS));
	}

	async alarm(): Promise<void> {
		await this.cleanupInactiveUsers();
		// Schedule next cleanup
		await this.ctx.storage.setAlarm(Date.now() + CLEANUP_INTERVAL_MS);
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const peek = url.searchParams.get("peek") === "1";
		const clientId = url.searchParams.get("clientId");

		// Non-mutating read: return current count without updating activity.
		if (peek) {
			await this.cleanupInactiveUsers();
			return new Response(
				JSON.stringify({
					count: this.activeUsers.size,
					timestamp: Date.now(),
					peek: true,
				}),
				{ headers: { "Content-Type": "application/json" } }
			);
		}

		if (!clientId) {
			return new Response(JSON.stringify({ error: "clientId is required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Update this user's last seen timestamp (in-memory + persisted)
		const now = Date.now();
		this.activeUsers.set(clientId, now);
		await this.ctx.storage.put(`${USER_KEY_PREFIX}${clientId}`, now);

		// Clean up expired users and get count
		await this.cleanupInactiveUsers();
		const count = this.activeUsers.size;

		return new Response(
			JSON.stringify({
				count,
				timestamp: Date.now(),
			}),
			{ headers: { "Content-Type": "application/json" } }
		);
	}

	private async cleanupInactiveUsers(): Promise<void> {
		const now = Date.now();
		const cutoff = now - ACTIVITY_WINDOW_MS;
		const expiredKeys: string[] = [];

		for (const [clientId, lastSeen] of this.activeUsers) {
			if (lastSeen < cutoff) {
				this.activeUsers.delete(clientId);
				expiredKeys.push(`${USER_KEY_PREFIX}${clientId}`);
			}
		}

		if (expiredKeys.length > 0) {
			await this.ctx.storage.delete(expiredKeys);
		}
	}
}
