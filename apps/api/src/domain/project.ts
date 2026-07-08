import { z } from "zod";

/**
 * Project registry domain models (Phase 1 — Foundation).
 *
 * A project is a road-construction initiative with a GIS boundary,
 * a timeline, and a set of milestones used later for progress scoring.
 */

export const MilestoneStatus = {
  Pending: "pending",
  InProgress: "in_progress",
  Completed: "completed",
} as const;

export const milestoneSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  plannedDate: z.string().datetime(),
  status: z.nativeEnum(MilestoneStatus).default(MilestoneStatus.Pending),
});

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  /** GeoJSON Polygon (WGS84). Validated structurally; PostGIS stores geometry. */
  boundary: z.object({
    type: z.literal("Polygon"),
    coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
  }),
  timelineStart: z.string().datetime(),
  timelineEnd: z.string().datetime(),
  milestones: z.array(milestoneSchema).default([]),
});

export const projectSchema = projectCreateSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Milestone = z.infer<typeof milestoneSchema>;
export type ProjectCreate = z.infer<typeof projectCreateSchema>;
export type Project = z.infer<typeof projectSchema>;
