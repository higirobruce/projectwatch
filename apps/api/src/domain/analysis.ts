import { z } from "zod";

/**
 * Analysis job domain (Phase 2 — Intelligence Layer).
 *
 * A job runs the change-detection engine over a project's ingested scenes,
 * producing a change score, progress estimate, and risk classification.
 */

export const riskEnum = z.enum(["green", "amber", "red"]);

export const analysisCreateSchema = z.object({
  projectId: z.string().uuid(),
});

export const analysisPatchSchema = z.object({
  status: z.enum(["pending", "processing", "done", "failed"]).optional(),
  changeScore: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
  progressPct: z.number().min(0).max(100).optional(),
  risk: riskEnum.optional(),
  reason: z.string().optional(),
  scenesCompared: z.array(z.string()).optional(),
  error: z.string().nullable().optional(),
});

export const analysisSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  status: z.string(),
  changeScore: z.number().nullable().optional(),
  confidence: z.number().nullable().optional(),
  progressPct: z.number().nullable().optional(),
  risk: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  scenesCompared: z.array(z.string()),
  error: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Analysis = z.infer<typeof analysisSchema>;
export type AnalysisPatch = z.infer<typeof analysisPatchSchema>;
