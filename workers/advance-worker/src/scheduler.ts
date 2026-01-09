/**
 * AdvanceScheduler Durable Object
 *
 * Provides precise scheduling for calling the /api/advance endpoint using
 * Durable Object Alarms. Alarms can be set to exact millisecond timestamps,
 * ensuring the API is called within ±10 seconds of the expected time.
 */

import { DurableObject } from "cloudflare:workers";

export interface SchedulerEnv {
	ADVANCE_API_KEY: string;
	API_BASE_URL: string;
}

interface AdvanceResponse {
	success?: boolean;
	nextCheckMs?: number;
	nextDeadlineMs?: number | null;
	message?: string;
	error?: string;
}

interface SchedulerState {
	lastCallTime: number | null;
	nextScheduledTime: number | null;
	consecutiveErrors: number;
	lastError: string | null;
}

const DEFAULT_INTERVAL_MS = 60 * 1000; // 60 seconds fallback
const MIN_INTERVAL_MS = 3 * 1000; // 3 seconds minimum
const MAX_RETRY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes max on errors
const INITIAL_RETRY_INTERVAL_MS = 10 * 1000; // 10 seconds initial retry

export class AdvanceScheduler extends DurableObject<SchedulerEnv> {
	private state: SchedulerState = {
		lastCallTime: null,
		nextScheduledTime: null,
		consecutiveErrors: 0,
		lastError: null,
	};
	private stateLoaded = false;

	/**
	 * Load state from storage (called lazily before operations)
	 */
	private async loadState(): Promise<void> {
		if (this.stateLoaded) return;
		const stored = await this.ctx.storage.get<SchedulerState>("state");
		if (stored) {
			this.state = stored;
		}
		this.stateLoaded = true;
	}

	/**
	 * Alarm handler - called at the precisely scheduled time
	 */
	async alarm(): Promise<void> {
		console.log(`[AdvanceScheduler] Alarm triggered at ${new Date().toISOString()}`);
		await this.runAdvanceCheck();
	}

	/**
	 * HTTP handler for the Durable Object
	 */
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		switch (url.pathname) {
			case "/trigger": {
				// Manual trigger - run immediately and reschedule
				await this.runAdvanceCheck();
				return new Response(
					JSON.stringify({ success: true, message: "Advance check triggered" }),
					{ headers: { "Content-Type": "application/json" } }
				);
			}

			case "/status": {
				// Return current scheduler status
				await this.loadState();
				const currentAlarm = await this.ctx.storage.getAlarm();
				return new Response(
					JSON.stringify({
						...this.state,
						currentAlarm,
						now: Date.now(),
						timeUntilNextAlarm: currentAlarm ? currentAlarm - Date.now() : null,
					}),
					{ headers: { "Content-Type": "application/json" } }
				);
			}

			case "/ensure": {
				// Ensure scheduler is active (called by cron fallback)
				const ensureResult = await this.ensureSchedulerActive();
				return new Response(
					JSON.stringify(ensureResult),
					{ headers: { "Content-Type": "application/json" } }
				);
			}

			case "/reset": {
				// Reset scheduler state and trigger immediate check
				await this.ctx.storage.deleteAll();
				this.state = {
					lastCallTime: null,
					nextScheduledTime: null,
					consecutiveErrors: 0,
					lastError: null,
				};
				this.stateLoaded = true;
				await this.runAdvanceCheck();
				return new Response(
					JSON.stringify({ success: true, message: "Scheduler reset" }),
					{ headers: { "Content-Type": "application/json" } }
				);
			}

			default:
				return new Response("Not Found", { status: 404 });
		}
	}

	/**
	 * Ensure the scheduler has an active alarm set
	 * Called by cron trigger as a fallback mechanism
	 */
	private async ensureSchedulerActive(): Promise<{
		wasActive: boolean;
		action: string;
		nextAlarm: number | null;
	}> {
		const currentAlarm = await this.ctx.storage.getAlarm();
		const now = Date.now();

		if (currentAlarm && currentAlarm > now) {
			// Alarm is set and in the future - scheduler is active
			return {
				wasActive: true,
				action: "none",
				nextAlarm: currentAlarm,
			};
		}

		// No active alarm - need to bootstrap
		console.log("[AdvanceScheduler] No active alarm found, bootstrapping...");
		await this.runAdvanceCheck();

		const newAlarm = await this.ctx.storage.getAlarm();
		return {
			wasActive: false,
			action: "bootstrapped",
			nextAlarm: newAlarm,
		};
	}

	/**
	 * Run the advance check by calling the API endpoint
	 */
	private async runAdvanceCheck(): Promise<void> {
		await this.loadState();
		const apiUrl = `${this.env.API_BASE_URL}/api/advance`;
		const now = Date.now();

		console.log(`[AdvanceScheduler] Calling advance API: ${apiUrl}`);

		try {
			const response = await fetch(apiUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-api-key": this.env.ADVANCE_API_KEY,
				},
			});

			const data: AdvanceResponse = await response.json();
			console.log("[AdvanceScheduler] API response:", JSON.stringify(data));

			if (!response.ok) {
				throw new Error(`API error: ${response.status} - ${data.error || "Unknown error"}`);
			}

			// Success - reset error counter
			this.state.consecutiveErrors = 0;
			this.state.lastError = null;
			this.state.lastCallTime = now;

			// Schedule next alarm based on API response
			await this.scheduleNextAlarm(data.nextCheckMs, data.nextDeadlineMs);

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("[AdvanceScheduler] Error calling advance API:", errorMessage);

			this.state.consecutiveErrors++;
			this.state.lastError = errorMessage;
			this.state.lastCallTime = now;

			// Calculate retry interval with exponential backoff
			const retryInterval = Math.min(
				INITIAL_RETRY_INTERVAL_MS * Math.pow(2, this.state.consecutiveErrors - 1),
				MAX_RETRY_INTERVAL_MS
			);

			console.log(
				`[AdvanceScheduler] Scheduling retry in ${retryInterval / 1000}s (attempt ${this.state.consecutiveErrors})`
			);

			await this.setAlarmAt(now + retryInterval);
		}

		// Persist state
		await this.ctx.storage.put("state", this.state);
	}

	/**
	 * Schedule the next alarm based on API response
	 * 
	 * IMPORTANT: The API returns:
	 * - nextCheckMs: The recommended DELAY before the next check (already capped at max 60s by API)
	 * - nextDeadlineMs: The actual deadline timestamp (can be far in the future, for info only)
	 * 
	 * We should ALWAYS use nextCheckMs for scheduling, as the API has already calculated
	 * the optimal check interval.
	 */
	private async scheduleNextAlarm(
		nextCheckMs?: number,
		_nextDeadlineMs?: number | null // Kept for logging/debugging but not used for scheduling
	): Promise<void> {
		const now = Date.now();
		let nextAlarmTime: number;

		if (nextCheckMs && nextCheckMs > 0) {
			// Use the recommended check interval from the API
			// The API already calculates this as: min(timeUntilDeadline, 60s), clamped to min 3s
			nextAlarmTime = now + Math.max(nextCheckMs, MIN_INTERVAL_MS);
			console.log(
				`[AdvanceScheduler] Scheduling in ${nextCheckMs / 1000}s (nextDeadline: ${_nextDeadlineMs ? new Date(_nextDeadlineMs).toISOString() : "none"})`
			);
		} else {
			// Fallback to default interval if no nextCheckMs provided
			nextAlarmTime = now + DEFAULT_INTERVAL_MS;
			console.log(
				`[AdvanceScheduler] No timing info, using default ${DEFAULT_INTERVAL_MS / 1000}s`
			);
		}

		await this.setAlarmAt(nextAlarmTime);
	}

	/**
	 * Set an alarm at a specific timestamp
	 */
	private async setAlarmAt(timestamp: number): Promise<void> {
		this.state.nextScheduledTime = timestamp;
		await this.ctx.storage.setAlarm(timestamp);
		console.log(
			`[AdvanceScheduler] Alarm set for ${new Date(timestamp).toISOString()} (in ${(timestamp - Date.now()) / 1000}s)`
		);
	}
}
