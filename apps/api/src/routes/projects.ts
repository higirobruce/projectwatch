import { Router } from "express";
import { projectCreateSchema } from "../domain/project.js";
import type { InMemoryStore } from "../repository/memory.js";
import type { PostgresStore } from "../repository/postgres.js";

type Store = InMemoryStore | PostgresStore;

export function createProjectRouter(store: Store): Router {
  const router = Router();
  const repo = store.projects;

  router.get("/", async (_req, res) => {
    const projects = await repo.list();
    res.json({ count: projects.length, projects });
  });

  router.get("/:id", async (req, res) => {
    const project = await repo.get(req.params.id);
    if (!project) {
      res.status(404).json({ error: "project_not_found" });
      return;
    }
    res.json(project);
  });

  router.post("/", async (req, res) => {
    const parsed = projectCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
      return;
    }
    const project = await repo.create(parsed.data);
    res.status(201).json(project);
  });

  // --- Analysis (Phase 2 — Intelligence) ---

  router.post("/:id/analyze", async (req, res) => {
    const project = await repo.get(req.params.id);
    if (!project) {
      res.status(404).json({ error: "project_not_found" });
      return;
    }
    const analysis = await store.analyses.create(project.id);
    res.status(202).json(analysis);
  });

  router.get("/:id/analyses", async (req, res) => {
    const project = await repo.get(req.params.id);
    if (!project) {
      res.status(404).json({ error: "project_not_found" });
      return;
    }
    const analyses = await store.analyses.listByProject(project.id);
    res.json({ count: analyses.length, analyses });
  });

  // --- Satellite ingestion (Phase 1) ---
  router.post("/:id/ingest", async (req, res) => {
    const project = await repo.get(req.params.id);
    if (!project) {
      res.status(404).json({ error: "project_not_found" });
      return;
    }
    const source = typeof req.query.source === "string" ? req.query.source : "sentinel-2";
    const ingestion = await store.ingestions.create(project.id, source);
    res.status(202).json(ingestion);
  });

  router.get("/:id/ingestions", async (req, res) => {
    const project = await repo.get(req.params.id);
    if (!project) {
      res.status(404).json({ error: "project_not_found" });
      return;
    }
    const ingestions = await store.ingestions.listByProject(project.id);
    res.json({ count: ingestions.length, ingestions });
  });

  return router;
}
