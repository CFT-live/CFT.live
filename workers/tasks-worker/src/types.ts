export type TaskStatus = "OPEN" | "CLAIMED" | "IN_REVIEW" | "CHANGES_REQUESTED" | "DONE";

export type TaskType =
	| "GENERAL"
	| "TECH"
	| "DESIGN"
	| "MARKETING"
	| "BUSINESS"
	| "DOCS";

export interface Task {
	id: string;
	title: string;
	bodyMarkdown: string;
	type: TaskType | string;
	status: TaskStatus | string;
	tags: string[];
	createdAt: number;
	updatedAt: number;
}

export interface TaskComment {
	id: string;
	taskId: string;
	authorAddress: string | null;
	contentMarkdown: string;
	createdAt: number;
}

export interface TaskPrLink {
	id: string;
	taskId: string;
	url: string;
	addedByAddress: string | null;
	addedAt: number;
}

export interface TaskContribution {
	taskId: string;
	contributorAddress: string;
	shareBps: number | null;
	note: string | null;
	updatedAt: number;
}

export interface TaskDetail extends Task {
	comments: TaskComment[];
	prLinks: TaskPrLink[];
	contributions: TaskContribution[];
}

export interface Env {
	DB: D1Database;
	ALLOWED_ORIGINS: string;
}
