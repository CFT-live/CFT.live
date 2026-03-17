import type { FeatureStatus, MutableFeatureStatus } from "./api/types";

export const CATEGORY_OPTIONS: string[] = [
  "Technical",
  "Design",
  "Marketing",
  "Business",
  "Docs",
];

export const STATUS_OPTIONS: MutableFeatureStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "CANCELLED",
];

/** Statuses that are considered "active" (shown in category sections). */
export const ACTIVE_STATUSES: FeatureStatus[] = ["OPEN", "IN_PROGRESS"];

/** Statuses that are considered "archived" (shown in the bottom section). */
export const ARCHIVED_STATUSES: FeatureStatus[] = ["COMPLETED", "CANCELLED"];
