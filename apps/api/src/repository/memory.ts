import { randomUUID } from "node:crypto";
import type { Project, ProjectCreate } from "../domain/project.js";
import type { Ingestion, IngestionPatch } from "../domain/ingestion.js";
import type { Analysis, AnalysisPatch } from "../domain/analysis.js";

/**
 * In-memory stores for Phase 1 scaffolding / local dev without PostGIS.
 * Mirrors the PostgresStore interface so the API layer is identical.
 */

export class InMemoryProjectRepository {
  private readonly projects = new Map<string, Project>();

  async list(): Promise<Project[]> {
    return [...this.projects.values()];
  }
  async get(id: string): Promise<Project | null> {
    return this.projects.get(id) ?? null;
  }
  async create(input: ProjectCreate): Promise<Project> {
    const now = new Date().toISOString();
    const project: Project = { id: randomUUID(), ...input, createdAt: now, updatedAt: now };
    this.projects.set(project.id, project);
    return project;
  }
}

export class InMemoryIngestionRepository {
  private readonly ingestions = new Map<string, Ingestion>();

  async create(projectId: string, source: string): Promise<Ingestion> {
    const now = new Date().toISOString();
    const ingestion: Ingestion = {
      id: randomUUID(),
      projectId,
      source,
      status: "pending",
      scenes: [],
      acquiredAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.ingestions.set(ingestion.id, ingestion);
    return ingestion;
  }
  async listByProject(projectId: string): Promise<Ingestion[]> {
    return [...this.ingestions.values()].filter((i) => i.projectId === projectId);
  }
  async listPending(): Promise<Ingestion[]> {
    return [...this.ingestions.values()].filter((i) => i.status === "pending");
  }
  async get(id: string): Promise<Ingestion | null> {
    return this.ingestions.get(id) ?? null;
  }
  async update(id: string, patch: IngestionPatch): Promise<Ingestion | null> {
    const cur = this.ingestions.get(id);
    if (!cur) return null;
    const next: Ingestion = {
      ...cur,
      ...patch,
      scenes: patch.scenes ?? cur.scenes,
      acquiredAt: patch.acquiredAt === undefined ? cur.acquiredAt : patch.acquiredAt,
      error: patch.error === undefined ? cur.error : patch.error,
      updatedAt: new Date().toISOString(),
    };
    this.ingestions.set(id, next);
    return next;
  }
}

export class InMemoryAnalysisRepository {
  private readonly analyses = new Map<string, Analysis>();

  async create(projectId: string): Promise<Analysis> {
    const now = new Date().toISOString();
    const analysis: Analysis = {
      id: randomUUID(),
      projectId,
      status: "pending",
      changeScore: undefined,
      confidence: undefined,
      progressPct: undefined,
      risk: undefined,
      reason: undefined,
      scenesCompared: [],
      error: undefined,
      createdAt: now,
      updatedAt: now,
    };
    this.analyses.set(analysis.id, analysis);
    return analysis;
  }
  async listByProject(projectId: string): Promise<Analysis[]> {
    return [...this.analyses.values()].filter((a) => a.projectId === projectId);
  }
  async listPending(): Promise<Analysis[]> {
    return [...this.analyses.values()].filter((a) => a.status === "pending");
  }
  async get(id: string): Promise<Analysis | null> {
    return this.analyses.get(id) ?? null;
  }
  async update(id: string, patch: AnalysisPatch): Promise<Analysis | null> {
    const cur = this.analyses.get(id);
    if (!cur) return null;
    const next: Analysis = {
      ...cur,
      ...patch,
      changeScore: patch.changeScore === undefined ? cur.changeScore : patch.changeScore,
      confidence: patch.confidence === undefined ? cur.confidence : patch.confidence,
      progressPct: patch.progressPct === undefined ? cur.progressPct : patch.progressPct,
      risk: patch.risk === undefined ? cur.risk : patch.risk,
      reason: patch.reason === undefined ? cur.reason : patch.reason,
      scenesCompared: patch.scenesCompared ?? cur.scenesCompared,
      error: patch.error === undefined ? cur.error : patch.error,
      updatedAt: new Date().toISOString(),
    };
    this.analyses.set(id, next);
    return next;
  }
}

export class InMemoryStore {
  readonly projects = new InMemoryProjectRepository();
  readonly ingestions = new InMemoryIngestionRepository();
  readonly analyses = new InMemoryAnalysisRepository();
  async init(): Promise<void> {}
  async close(): Promise<void> {}
}
