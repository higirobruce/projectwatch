import { z } from "zod";

export const groundTruthCreateSchema = z.object({
  analysisId: z.string().uuid(),
  observedChange: z.number().min(0).max(1).optional(),
  observedProgress: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
  recordedBy: z.string().max(200).optional(),
});

export const groundTruthSchema = groundTruthCreateSchema.extend({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  recordedAt: z.string(),
});

export type GroundTruth = z.infer<typeof groundTruthSchema>;
export type GroundTruthCreate = z.infer<typeof groundTruthCreateSchema>;
