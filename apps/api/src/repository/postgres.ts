import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { Milestone, Project, ProjectCreate } from "../domain/project.js";
import type { Ingestion, IngestionPatch, IngestionScene } from "../domain/ingestion.js";

/**
 * PostGIS-backed repositories (Phase 1).
 *
 * Stores project boundaries as GEOMETRY(POLYGON, 4326) and milestones as JSONB;
 * ingestion jobs as rows with JSONB scene metadata. Geometry is round-tripped
 * as GeoJSON for a clean API contract. All migrations in `migrations/` are
 * applied in filename order on boot.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "..", "migrations");

function loadMigrations(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"));
}

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
    boundary: row.boundary,
    timelineStart: new Date(row.timeline_start).toISOString(),
    timelineEnd: new Date(row.timeline_end).toISOString(),
    milestones: row.milestones ?? [],
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

interface IngestionRow {
  id: string;
  project_id: string;
  source: string;
  status: string;
  scenes: IngestionScene[];
  acquired_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

function rowToIngestion(row: IngestionRow): Ingestion {
  return {
    id: row.id,
    projectId: row.project_id,
    source: row.source,
    status: row.status as Ingestion["status"],
    scenes: row.scenes ?? [],
    acquiredAt: row.acquired_at ? new Date(row.acquired_at).toISOString() : null,
    error: row.error ?? undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export class PostgresProjectRepository {
  constructor(private readonly pool: Pool) {}

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
}

export class PostgresIngestionRepository {
  constructor(private readonly pool: Pool) {}

  async create(projectId: string, source: string): Promise<Ingestion> {
    const { rows } = await this.pool.query<IngestionRow>(
      `INSERT INTO ingestions (id, project_id, source, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [randomUUID(), projectId, source],
    );
    return rowToIngestion(rows[0]!);
  }

  async listByProject(projectId: string): Promise<Ingestion[]> {
    const { rows } = await this.pool.query<IngestionRow>(
      `SELECT * FROM ingestions WHERE project_id = $1 ORDER BY created_at DESC`,
      [projectId],
    );
    return rows.map(rowToIngestion);
  }

  async listPending(): Promise<Ingestion[]> {
    const { rows } = await this.pool.query<IngestionRow>(
      `SELECT * FROM ingestions WHERE status = 'pending' ORDER BY created_at ASC`,
    );
    return rows.map(rowToIngestion);
  }

  async get(id: string): Promise<Ingestion | null> {
    const { rows } = await this.pool.query<IngestionRow>(
      `SELECT * FROM ingestions WHERE id = $1`,
      [id],
    );
    return rows[0] ? rowToIngestion(rows[0]) : null;
  }

  async update(id: string, patch: IngestionPatch): Promise<Ingestion | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (patch.status !== undefined) { sets.push(`status = $${i++}`); values.push(patch.status); }
    if (patch.scenes !== undefined) { sets.push(`scenes = $${i++}`); values.push(JSON.stringify(patch.scenes)); }
    if (patch.acquiredAt !== undefined) { sets.push(`acquired_at = $${i++}`); values.push(patch.acquiredAt); }
    if (patch.error !== undefined) { sets.push(`error = $${i++}`); values.push(patch.error); }
    sets.push(`updated_at = now()`);
    values.push(id);
    const { rows } = await this.pool.query<IngestionRow>(
      `UPDATE ingestions SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );
    return rows[0] ? rowToIngestion(rows[0]) : null;
  }
}

export class PostgresStore {
  readonly projects: PostgresProjectRepository;
  readonly ingestions: PostgresIngestionRepository;

  constructor(private readonly pool: Pool) {
    this.projects = new PostgresProjectRepository(pool);
    this.ingestions = new PostgresIngestionRepository(pool);
  }

  async init(): Promise<void> {
    for (const sql of loadMigrations()) {
      await this.pool.query(sql);
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
