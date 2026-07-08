import { Router } from "express";
import { projectCreateSchema } from "../domain/project.js";
import type { ProjectRepository } from "../repository/memory.js";

export function createProjectRouter(repo: ProjectRepository): Router {
  const router = Router();

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

  return router;
}
