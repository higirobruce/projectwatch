import { Router } from "express";
import { analysisPatchSchema } from "../domain/analysis.js";
import type { InMemoryStore } from "../repository/memory.js";
import type { PostgresStore } from "../repository/postgres.js";

type Store = InMemoryStore | PostgresStore;

/** Worker-facing routes: poll pending analysis jobs and report results. */
export function createAnalysisWorkerRouter(store: Store): Router {
  const router = Router();

  router.get("/pending", async (_req, res) => {
    const pending = await store.analyses.listPending();
    res.json({ count: pending.length, analyses: pending });
  });

  router.patch("/:id", async (req, res) => {
    const parsed = analysisPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
      return;
    }
    const updated = await store.analyses.update(req.params.id, parsed.data);
    if (!updated) {
      res.status(404).json({ error: "analysis_not_found" });
      return;
    }
    res.json(updated);
  });

  return router;
}
