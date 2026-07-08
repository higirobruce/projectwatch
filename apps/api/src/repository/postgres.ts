import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { Milestone, Project, ProjectCreate } from "../domain/project.js";

/**
 * PostGIS-backed project repository (Phase 1).
 *
 * Stores project boundaries as GEOMETRY(POLYGON, 4326) and milestones as JSONB.
 * Geometry is round-tripped as GeoJSON for a clean API contract.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION = readFileSync(join(__dirname, "..", "..", "migrations", "001_project_registry.sql"), "utf8");

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  timeline_start: string;
  timeline_end: string;
  milestones: Milestone[];
  boundary: Project["boundary"];
  created_at: string;
  updated_at: string;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    boundary: row.boundary, // already GeoJSON from ST_AsGeoJSON
    timelineStart: new Date(row.timeline_start).toISOString(),
    timelineEnd: new Date(row.timeline_end).toISOString(),
    milestones: row.milestones ?? [],
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export class PostgresProjectRepository {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 5 });
  }

  async init(): Promise<void> {
    await this.pool.query(MIGRATION);
  }

  async list(): Promise<Project[]> {
    const { rows } = await this.pool.query<ProjectRow>(
      `SELECT id, name, description, timeline_start, timeline_end, milestones,
              ST_AsGeoJSON(boundary)::json AS boundary,
              created_at, updated_at
         FROM projects
        ORDER BY created_at DESC`,
    );
    return rows.map(rowToProject);
  }

  async get(id: string): Promise<Project | null> {
    const { rows } = await this.pool.query<ProjectRow>(
      `SELECT id, name, description, timeline_start, timeline_end, milestones,
              ST_AsGeoJSON(boundary)::json AS boundary,
              created_at, updated_at
         FROM projects
        WHERE id = $1`,
      [id],
    );
    return rows[0] ? rowToProject(rows[0]) : null;
  }

  async create(input: ProjectCreate): Promise<Project> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const { rows } = await this.pool.query<ProjectRow>(
      `INSERT INTO projects (id, name, description, boundary, timeline_start, timeline_end, milestones, created_at, updated_at)
       VALUES ($1, $2, $3, ST_GeomFromGeoJSON($4), $5, $6, $7::jsonb, $8, $9)
       RETURNING id, name, description, timeline_start, timeline_end, milestones,
                 ST_AsGeoJSON(boundary)::json AS boundary, created_at, updated_at`,
      [
        id,
        input.name,
        input.description ?? null,
        JSON.stringify(input.boundary),
        input.timelineStart,
        input.timelineEnd,
        JSON.stringify(input.milestones),
        now,
        now,
      ],
    );
    const created = rows[0];
    if (!created) throw new Error("project_insert_failed");
    return rowToProject(created);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
