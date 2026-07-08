import { z } from "zod";

/**
 * Ingestion job domain (Phase 1 — Satellite Data Integration).
 *
 * A job is created (status `pending`) when ingestion is triggered for a
 * project. The ingestion worker processes it: retrieves satellite scenes
 * for the project boundary, preprocesses them, and stages rasters to
 * object storage. `scenes` records each retrieved scene's metadata.
 */

export const ingestionSceneSchema = z.object({
  sceneId: z.string(),
  acquiredAt: z.string(), // ISO date of acquisition
  rasterKey: z.string(), // object-storage key for the processed raster
  source: z.string(),
});

export const ingestionStatus = z.enum(["pending", "processing", "done", "failed"]);

export const ingestionCreateSchema = z.object({
  projectId: z.string().uuid(),
  source: z.string().default("sentinel-2"),
});

export const ingestionSchema = ingestionCreateSchema.extend({
  id: z.string().uuid(),
  status: ingestionStatus,
  scenes: z.array(ingestionSceneSchema).default([]),
  acquiredAt: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ingestionPatchSchema = z.object({
  status: ingestionStatus.optional(),
  scenes: z.array(ingestionSceneSchema).optional(),
  acquiredAt: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
});

export type IngestionScene = z.infer<typeof ingestionSceneSchema>;
export type Ingestion = z.infer<typeof ingestionSchema>;
export type IngestionPatch = z.infer<typeof ingestionPatchSchema>;
