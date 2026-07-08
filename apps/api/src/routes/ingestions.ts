import { Router } from "express";
import { ingestionPatchSchema } from "../domain/ingestion.js";
import type { InMemoryStore } from "../repository/memory.js";
import type { PostgresStore } from "../repository/postgres.js";

type Store = InMemoryStore | PostgresStore;

/** Worker-facing routes: poll pending jobs and report results. */
export function createWorkerRouter(store: Store): Router {
  const router = Router();

  router.get("/pending", async (_req, res) => {
    const pending = await store.ingestions.listPending();
    res.json({ count: pending.length, ingestions: pending });
  });

  router.patch("/:id", async (req, res) => {
    const parsed = ingestionPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
      return;
    }
    const updated = await store.ingestions.update(req.params.id, parsed.data);
    if (!updated) {
      res.status(404).json({ error: "ingestion_not_found" });
      return;
    }
    res.json(updated);
  });

  return router;
}
