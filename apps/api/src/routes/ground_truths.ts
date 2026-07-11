import { Router } from "express";
import { groundTruthCreateSchema } from "../domain/ground_truth.js";
import type { InMemoryStore } from "../repository/memory.js";
import type { PostgresStore } from "../repository/postgres.js";

type Store = InMemoryStore | PostgresStore;

export function createGroundTruthRouter(store: Store): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    const parsed = groundTruthCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
      return;
    }
    const analysis = await store.analyses.get(parsed.data.analysisId);
    if (!analysis) {
      res.status(404).json({ error: "analysis_not_found" });
      return;
    }
    const truth = await store.groundTruths.create(analysis.projectId, parsed.data);
    res.status(201).json(truth);
  });

  router.get("/by-analysis/:analysisId", async (req, res) => {
    const truths = await store.groundTruths.listByAnalysis(req.params.analysisId);
    res.json({ count: truths.length, groundTruths: truths });
  });

  return router;
}
