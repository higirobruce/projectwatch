import { randomUUID } from "node:crypto";
import type { Project, ProjectCreate } from "../domain/project.js";

/**
 * In-memory project store for Phase 1 scaffolding.
 *
 * NOTE: This is a stand-in for PostgreSQL + PostGIS. A real repository
 * (see apps/api/src/repository/postgres.ts, Phase 1) will replace it
 * once the database container is wired. Keeping the interface stable
 * means the API layer does not change when we swap the backend.
 */
export interface ProjectRepository {
  list(): Promise<Project[]>;
  get(id: string): Promise<Project | null>;
  create(input: ProjectCreate): Promise<Project>;
}

export class InMemoryProjectRepository implements ProjectRepository {
  private readonly projects = new Map<string, Project>();

  async list(): Promise<Project[]> {
    return [...this.projects.values()];
  }

  async get(id: string): Promise<Project | null> {
    return this.projects.get(id) ?? null;
  }

  async create(input: ProjectCreate): Promise<Project> {
    const now = new Date().toISOString();
    const project: Project = {
      id: randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(project.id, project);
    return project;
  }
}
