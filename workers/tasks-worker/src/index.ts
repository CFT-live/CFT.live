import type { Env } from "./types";
import {
	addComment,
	addPrLink,
	createTask,
	deleteTask,
	getTaskDetail,
	listTasks,
	patchTask,
	upsertContribution,
} from "./db";

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
		headers["Access-Control-Allow-Methods"] =
			"GET, POST, PATCH, PUT, DELETE, OPTIONS";
		headers["Access-Control-Allow-Headers"] = "Content-Type";
		headers["Access-Control-Max-Age"] = "86400";
	}

	return headers;
}

function json(env: Env, origin: string | null, data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: getCorsHeaders(origin, env),
	});
}

function notFound(env: Env, origin: string | null): Response {
	return json(env, origin, { error: "Not Found" }, 404);
}

function badRequest(env: Env, origin: string | null, message: string): Response {
	return json(env, origin, { error: message }, 400);
}

function serverError(env: Env, origin: string | null, error: unknown): Response {
	console.error("[Tasks Worker] Error:", error);
	return json(env, origin, { error: "Internal server error" }, 500);
}


const worker = {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const origin = request.headers.get("Origin");

		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: getCorsHeaders(origin, env),
			});
		}

		if (url.pathname === "/health") {
			return json(env, origin, { status: "ok" });
		}

		// GET /tasks
		if (url.pathname === "/tasks" && request.method === "GET") {
			try {
				const status = url.searchParams.get("status");
				const type = url.searchParams.get("type");
				const q = url.searchParams.get("q");
				const tagsParam = url.searchParams.get("tags");
				const tags = tagsParam
					? tagsParam
							.split(",")
							.map((t) => t.trim())
							.filter(Boolean)
					: [];
				const limitParam = url.searchParams.get("limit");
				const cursorParam = url.searchParams.get("cursor");
				const limit = limitParam ? Number(limitParam) : undefined;
				const cursor = cursorParam ? Number(cursorParam) : null;

				const result = await listTasks(env, {
					status,
					type,
					q,
					tags,
					limit,
					cursor: Number.isFinite(cursor as number) ? (cursor as number) : null,
				});

				return json(env, origin, result);
			} catch (error) {
				return serverError(env, origin, error);
			}
		}

		// POST /tasks
		if (url.pathname === "/tasks" && request.method === "POST") {
			try {
				const body = (await request.json()) as unknown;
				if (!body || typeof body !== "object") {
					return badRequest(env, origin, "Invalid request body");
				}

				const task = await createTask(env, body as Record<string, unknown>);
				return json(env, origin, { task }, 201);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return badRequest(env, origin, message);
			}
		}

		// Routes: /tasks/:id
		const taskMatch = url.pathname.match(/^\/tasks\/([0-9a-fA-F-]{36})$/);
		if (taskMatch) {
			const taskId = taskMatch[1]!;

			if (request.method === "GET") {
				try {
					const detail = await getTaskDetail(env, taskId);
					if (!detail) return notFound(env, origin);
					return json(env, origin, { task: detail });
				} catch (error) {
					return serverError(env, origin, error);
				}
			}

			if (request.method === "PATCH") {
				try {
					const body = (await request.json()) as unknown;
					if (!body || typeof body !== "object") {
						return badRequest(env, origin, "Invalid request body");
					}
					const updated = await patchTask(env, taskId, body as Record<string, unknown>);
					if (!updated) return notFound(env, origin);
					return json(env, origin, { task: updated });
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					return badRequest(env, origin, message);
				}
			}

			if (request.method === "DELETE") {
				try {
					const ok = await deleteTask(env, taskId);
					if (!ok) return notFound(env, origin);
					return json(env, origin, { ok: true }, 200);
				} catch (error) {
					return serverError(env, origin, error);
				}
			}
		}

		// POST /tasks/:id/comments
		const commentMatch = url.pathname.match(/^\/tasks\/([0-9a-fA-F-]{36})\/comments$/);
		if (commentMatch && request.method === "POST") {
			try {
				const taskId = commentMatch[1]!;
				const body = (await request.json()) as unknown;
				if (!body || typeof body !== "object") {
					return badRequest(env, origin, "Invalid request body");
				}
				const comment = await addComment(env, taskId, body as Record<string, unknown>);
				return json(env, origin, { comment }, 201);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return badRequest(env, origin, message);
			}
		}

		// POST /tasks/:id/pr-links
		const prMatch = url.pathname.match(/^\/tasks\/([0-9a-fA-F-]{36})\/pr-links$/);
		if (prMatch && request.method === "POST") {
			try {
				const taskId = prMatch[1]!;
				const body = (await request.json()) as unknown;
				if (!body || typeof body !== "object") {
					return badRequest(env, origin, "Invalid request body");
				}
				const prLink = await addPrLink(env, taskId, body as Record<string, unknown>);
				return json(env, origin, { prLink }, 201);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return badRequest(env, origin, message);
			}
		}

		// PUT /tasks/:id/contributions
		const contribMatch = url.pathname.match(/^\/tasks\/([0-9a-fA-F-]{36})\/contributions$/);
		if (contribMatch && request.method === "PUT") {
			try {
				const taskId = contribMatch[1]!;
				const body = (await request.json()) as unknown;
				if (!body || typeof body !== "object") {
					return badRequest(env, origin, "Invalid request body");
				}
				const contribution = await upsertContribution(
					env,
					taskId,
					body as Record<string, unknown>
				);
				return json(env, origin, { contribution }, 200);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return badRequest(env, origin, message);
			}
		}

		return notFound(env, origin);
	},
};

export default worker;
