import type {
	Env,
	Task,
	TaskComment,
	TaskContribution,
	TaskDetail,
	TaskPrLink,
} from "./types";

function safeJsonParseArray(value: string | null): string[] {
	if (!value) return [];
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : [];
	} catch {
		return [];
	}
}

function normalizeTags(tags: unknown): string[] {
	if (!Array.isArray(tags)) return [];
	const normalized = tags
		.filter((t) => typeof t === "string")
		.map((t) => t.trim())
		.filter((t) => t.length > 0)
		.map((t) => t.toLowerCase());
	return Array.from(new Set(normalized)).slice(0, 20);
}

export async function listTasks(env: Env, opts: {
	status?: string | null;
	type?: string | null;
	q?: string | null;
	tags?: string[];
	limit?: number;
	cursor?: number | null;
}): Promise<{ tasks: Task[]; nextCursor: number | null }> {
	const where: string[] = [];
	const bindings: unknown[] = [];

	if (opts.status) {
		where.push("status = ?");
		bindings.push(opts.status);
	}
	if (opts.type) {
		where.push("type = ?");
		bindings.push(opts.type);
	}
	if (opts.q) {
		where.push("(lower(title) LIKE ? OR lower(body_markdown) LIKE ?)");
		const like = `%${opts.q.toLowerCase()}%`;
		bindings.push(like, like);
	}
	if (opts.tags && opts.tags.length > 0) {
		for (const tag of opts.tags) {
			where.push("instr(lower(tags_json), ?) > 0");
			bindings.push(`\"${tag.toLowerCase()}\"`);
		}
	}
	if (typeof opts.cursor === "number") {
		where.push("updated_at < ?");
		bindings.push(opts.cursor);
	}

	const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
	const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100);

	const sql = `
		SELECT id, title, body_markdown, type, status, tags_json, created_at, updated_at
		FROM tasks
		${whereSql}
		ORDER BY updated_at DESC
		LIMIT ?
	`;

	const result = await env.DB.prepare(sql)
		.bind(...bindings, limit)
		.all<{
			id: string;
			title: string;
			body_markdown: string;
			type: string;
			status: string;
			tags_json: string;
			created_at: number;
			updated_at: number;
		}>();

	const rows = (result.results ?? []) as Array<{
		id: string;
		title: string;
		body_markdown: string;
		type: string;
		status: string;
		tags_json: string;
		created_at: number;
		updated_at: number;
	}>;
	const tasks: Task[] = rows.map((r) => ({
		id: r.id,
		title: r.title,
		bodyMarkdown: r.body_markdown,
		type: r.type,
		status: r.status,
		tags: safeJsonParseArray(r.tags_json),
		createdAt: r.created_at,
		updatedAt: r.updated_at,
	}));

	const nextCursor = tasks.length === limit ? tasks[tasks.length - 1]!.updatedAt : null;
	return { tasks, nextCursor };
}

export async function createTask(
	env: Env,
	input: Record<string, unknown>
): Promise<Task> {
	const now = Date.now();
	const id = crypto.randomUUID();
	const title = typeof input.title === "string" ? input.title.trim() : "";
	if (title.length < 3) throw new Error("Title must be at least 3 characters");
	const bodyMarkdown = typeof input.bodyMarkdown === "string" ? input.bodyMarkdown : "";
	const type = typeof input.type === "string" ? input.type.trim() : "GENERAL";
	const status = typeof input.status === "string" ? input.status.trim() : "OPEN";
	const tags = normalizeTags(input.tags);
	const tagsJson = JSON.stringify(tags);

	await env.DB.prepare(
		"INSERT INTO tasks (id, title, body_markdown, type, status, tags_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
	)
		.bind(id, title, bodyMarkdown, type, status, tagsJson, now, now)
		.run();

	return {
		id,
		title,
		bodyMarkdown,
		type,
		status,
		tags,
		createdAt: now,
		updatedAt: now,
	};
}

export async function getTaskDetail(env: Env, taskId: string): Promise<TaskDetail | null> {
	const taskRes = await env.DB.prepare(
		"SELECT id, title, body_markdown, type, status, tags_json, created_at, updated_at FROM tasks WHERE id = ?"
	)
		.bind(taskId)
		.first<{
			id: string;
			title: string;
			body_markdown: string;
			type: string;
			status: string;
			tags_json: string;
			created_at: number;
			updated_at: number;
		}>();

	if (!taskRes) return null;

	const commentsRes = await env.DB.prepare(
		"SELECT id, task_id, author_address, content_markdown, created_at FROM task_comments WHERE task_id = ? ORDER BY created_at ASC LIMIT 200"
	)
		.bind(taskId)
		.all<{
			id: string;
			task_id: string;
			author_address: string | null;
			content_markdown: string;
			created_at: number;
		}>();

	const prRes = await env.DB.prepare(
		"SELECT id, task_id, url, added_by_address, added_at FROM task_pr_links WHERE task_id = ? ORDER BY added_at ASC LIMIT 200"
	)
		.bind(taskId)
		.all<{
			id: string;
			task_id: string;
			url: string;
			added_by_address: string | null;
			added_at: number;
		}>();

	const contribRes = await env.DB.prepare(
		"SELECT task_id, contributor_address, share_bps, note, updated_at FROM task_contributions WHERE task_id = ? ORDER BY updated_at DESC LIMIT 200"
	)
		.bind(taskId)
		.all<{
			task_id: string;
			contributor_address: string;
			share_bps: number | null;
			note: string | null;
			updated_at: number;
		}>();

	const commentRows = (commentsRes.results ?? []) as Array<{
		id: string;
		task_id: string;
		author_address: string | null;
		content_markdown: string;
		created_at: number;
	}>;
	const comments: TaskComment[] = commentRows.map((r) => ({
		id: r.id,
		taskId: r.task_id,
		authorAddress: r.author_address,
		contentMarkdown: r.content_markdown,
		createdAt: r.created_at,
	}));

	const prRows = (prRes.results ?? []) as Array<{
		id: string;
		task_id: string;
		url: string;
		added_by_address: string | null;
		added_at: number;
	}>;
	const prLinks: TaskPrLink[] = prRows.map((r) => ({
		id: r.id,
		taskId: r.task_id,
		url: r.url,
		addedByAddress: r.added_by_address,
		addedAt: r.added_at,
	}));

	const contribRows = (contribRes.results ?? []) as Array<{
		task_id: string;
		contributor_address: string;
		share_bps: number | null;
		note: string | null;
		updated_at: number;
	}>;
	const contributions: TaskContribution[] = contribRows.map((r) => ({
		taskId: r.task_id,
		contributorAddress: r.contributor_address,
		shareBps: r.share_bps,
		note: r.note,
		updatedAt: r.updated_at,
	}));

	return {
		id: taskRes.id,
		title: taskRes.title,
		bodyMarkdown: taskRes.body_markdown,
		type: taskRes.type,
		status: taskRes.status,
		tags: safeJsonParseArray(taskRes.tags_json),
		createdAt: taskRes.created_at,
		updatedAt: taskRes.updated_at,
		comments,
		prLinks,
		contributions,
	};
}

export async function patchTask(env: Env, taskId: string, input: {
	title?: unknown;
	bodyMarkdown?: unknown;
	type?: unknown;
	status?: unknown;
	tags?: unknown;
}): Promise<Task | null> {
	const existing = await env.DB.prepare(
		"SELECT id, title, body_markdown, type, status, tags_json, created_at, updated_at FROM tasks WHERE id = ?"
	)
		.bind(taskId)
		.first<{
			id: string;
			title: string;
			body_markdown: string;
			type: string;
			status: string;
			tags_json: string;
			created_at: number;
			updated_at: number;
		}>();
	if (!existing) return null;

	const now = Date.now();
	const title = typeof input.title === "string" ? input.title.trim() : existing.title;
	const bodyMarkdown =
		typeof input.bodyMarkdown === "string" ? input.bodyMarkdown : existing.body_markdown;
	const type = typeof input.type === "string" ? input.type.trim() : existing.type;
	const status = typeof input.status === "string" ? input.status.trim() : existing.status;
	const tags = input.tags !== undefined ? normalizeTags(input.tags) : safeJsonParseArray(existing.tags_json);
	const tagsJson = JSON.stringify(tags);

	await env.DB.prepare(
		"UPDATE tasks SET title = ?, body_markdown = ?, type = ?, status = ?, tags_json = ?, updated_at = ? WHERE id = ?"
	)
		.bind(title, bodyMarkdown, type, status, tagsJson, now, taskId)
		.run();

	return {
		id: existing.id,
		title,
		bodyMarkdown,
		type,
		status,
		tags,
		createdAt: existing.created_at,
		updatedAt: now,
	};
}

export async function addComment(env: Env, taskId: string, input: {
	authorAddress?: unknown;
	contentMarkdown?: unknown;
}): Promise<TaskComment> {
	const now = Date.now();
	const id = crypto.randomUUID();
	const authorAddress =
		typeof input.authorAddress === "string" ? input.authorAddress.toLowerCase() : null;
	const contentMarkdown =
		typeof input.contentMarkdown === "string" ? input.contentMarkdown.trim().slice(0, 5000) : "";
	if (contentMarkdown.length === 0) throw new Error("Comment cannot be empty");

	await env.DB.prepare(
		"INSERT INTO task_comments (id, task_id, author_address, content_markdown, created_at) VALUES (?, ?, ?, ?, ?)"
	)
		.bind(id, taskId, authorAddress, contentMarkdown, now)
		.run();

	await env.DB.prepare("UPDATE tasks SET updated_at = ? WHERE id = ?")
		.bind(now, taskId)
		.run();

	return { id, taskId, authorAddress, contentMarkdown, createdAt: now };
}

export async function addPrLink(env: Env, taskId: string, input: {
	url?: unknown;
	addedByAddress?: unknown;
}): Promise<TaskPrLink> {
	const now = Date.now();
	const id = crypto.randomUUID();
	const url = typeof input.url === "string" ? input.url.trim() : "";
	if (!/^https?:\/\//.test(url)) throw new Error("PR link must be a valid URL");
	const addedByAddress =
		typeof input.addedByAddress === "string" ? input.addedByAddress.toLowerCase() : null;

	await env.DB.prepare(
		"INSERT INTO task_pr_links (id, task_id, url, added_by_address, added_at) VALUES (?, ?, ?, ?, ?)"
	)
		.bind(id, taskId, url, addedByAddress, now)
		.run();

	await env.DB.prepare("UPDATE tasks SET updated_at = ? WHERE id = ?")
		.bind(now, taskId)
		.run();

	return { id, taskId, url, addedByAddress, addedAt: now };
}

export async function upsertContribution(env: Env, taskId: string, input: {
	contributorAddress?: unknown;
	shareBps?: unknown;
	note?: unknown;
}): Promise<TaskContribution> {
	const now = Date.now();
	const contributorAddress =
		typeof input.contributorAddress === "string" ? input.contributorAddress.toLowerCase() : "";
	if (!/^0x[a-fA-F0-9]{40}$/.test(contributorAddress)) {
		throw new Error("Invalid contributor address");
	}

	let shareBps: number | null = null;
	if (input.shareBps !== undefined && input.shareBps !== null && input.shareBps !== "") {
		const n = typeof input.shareBps === "number" ? input.shareBps : Number(input.shareBps);
		if (!Number.isFinite(n)) throw new Error("shareBps must be a number");
		const int = Math.round(n);
		if (int < 0 || int > 10000) throw new Error("shareBps must be between 0 and 10000");
		shareBps = int;
	}

	const note = typeof input.note === "string" ? input.note.trim().slice(0, 500) : null;

	await env.DB.prepare(
		"INSERT INTO task_contributions (task_id, contributor_address, share_bps, note, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(task_id, contributor_address) DO UPDATE SET share_bps = excluded.share_bps, note = excluded.note, updated_at = excluded.updated_at"
	)
		.bind(taskId, contributorAddress, shareBps, note, now)
		.run();

	await env.DB.prepare("UPDATE tasks SET updated_at = ? WHERE id = ?")
		.bind(now, taskId)
		.run();

	return { taskId, contributorAddress, shareBps, note, updatedAt: now };
}

export async function deleteTask(env: Env, taskId: string): Promise<boolean> {
	const existing = await env.DB.prepare("SELECT id FROM tasks WHERE id = ?")
		.bind(taskId)
		.first<{ id: string }>();
	if (!existing) return false;

	// Delete children explicitly (even though schema uses ON DELETE CASCADE)
	await env.DB.prepare("DELETE FROM task_comments WHERE task_id = ?").bind(taskId).run();
	await env.DB.prepare("DELETE FROM task_pr_links WHERE task_id = ?").bind(taskId).run();
	await env.DB.prepare("DELETE FROM task_contributions WHERE task_id = ?").bind(taskId).run();
	await env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(taskId).run();
	return true;
}
