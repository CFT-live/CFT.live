import { z } from "zod";
import {
  ContributorSchema,
  ContributorStatus,
  TeamRole,
  FeatureDistributionSchema,
  FeatureSchema,
  CompletedFeatureSchema,
  FeatureStatus,
  ContributionSchema,
  ContributionStatus,
  TaskSchema,
  TaskStatus,
  TaskType,
  TransactionStatus,
} from "./schemas";

export type Contributor = z.infer<typeof ContributorSchema>;
export type ContributorStatus = z.infer<typeof ContributorStatus>;
export type TeamRole = z.infer<typeof TeamRole>;

export type Feature = z.infer<typeof FeatureSchema>;
export type CompletedFeature = z.infer<typeof CompletedFeatureSchema>;
export type FeatureStatus = z.infer<typeof FeatureStatus>;

export type Task = z.infer<typeof TaskSchema>;
export type TaskStatus = z.infer<typeof TaskStatus>;
export type TaskType = z.infer<typeof TaskType>;

export type Contribution = z.infer<typeof ContributionSchema>;
export type ContributionStatus = z.infer<typeof ContributionStatus>;

export type FeatureDistribution = z.infer<typeof FeatureDistributionSchema>;
export type TransactionStatus = z.infer<typeof TransactionStatus>;
