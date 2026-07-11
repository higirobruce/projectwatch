import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { Milestone, Project, ProjectCreate } from "../domain/project.js";
import type { Ingestion, IngestionPatch, IngestionScene } from "../domain/ingestion.js";
import type { Analysis, AnalysisPatch } from "../domain/analysis.js";
import type { GroundTruth, GroundTruthCreate } from "../domain/ground_truth.js";

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

interface AnalysisRow {
  id: string;
  project_id: string;
  status: string;
  change_score: number | null;
  confidence: number | null;
  progress_pct: number | null;
  risk: string | null;
  reason: string | null;
  scenes_compared: string[];
  error: string | null;
  created_at: string;
  updated_at: string;
}

function rowToAnalysis(row: AnalysisRow): Analysis {
  return {
    id: row.id,
    projectId: row.project_id,
    status: row.status,
    changeScore: row.change_score ?? undefined,
    confidence: row.confidence ?? undefined,
    progressPct: row.progress_pct ?? undefined,
    risk: row.risk ?? undefined,
    reason: row.reason ?? undefined,
    scenesCompared: row.scenes_compared ?? [],
    error: row.error ?? undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export class PostgresAnalysisRepository {
  constructor(private readonly pool: Pool) {}

  async create(projectId: string): Promise<Analysis> {
    const { rows } = await this.pool.query<AnalysisRow>(
      `INSERT INTO analyses (id, project_id, status)
       VALUES (gen_random_uuid(), $1, 'pending') RETURNING *`,
      [projectId],
    );
    return rowToAnalysis(rows[0]!);
  }

  async listByProject(projectId: string): Promise<Analysis[]> {
    const { rows } = await this.pool.query<AnalysisRow>(
      `SELECT * FROM analyses WHERE project_id = $1 ORDER BY created_at DESC`,
      [projectId],
    );
    return rows.map(rowToAnalysis);
  }

  async listPending(): Promise<Analysis[]> {
    const { rows } = await this.pool.query<AnalysisRow>(
      `SELECT * FROM analyses WHERE status = 'pending' ORDER BY created_at ASC`,
    );
    return rows.map(rowToAnalysis);
  }

  async get(id: string): Promise<Analysis | null> {
    const { rows } = await this.pool.query<AnalysisRow>(`SELECT * FROM analyses WHERE id = $1`, [id]);
    return rows[0] ? rowToAnalysis(rows[0]) : null;
  }

  async update(id: string, patch: AnalysisPatch): Promise<Analysis | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (patch.status !== undefined) { sets.push(`status = $${i++}`); values.push(patch.status); }
    if (patch.changeScore !== undefined) { sets.push(`change_score = $${i++}`); values.push(patch.changeScore); }
    if (patch.confidence !== undefined) { sets.push(`confidence = $${i++}`); values.push(patch.confidence); }
    if (patch.progressPct !== undefined) { sets.push(`progress_pct = $${i++}`); values.push(patch.progressPct); }
    if (patch.risk !== undefined) { sets.push(`risk = $${i++}`); values.push(patch.risk); }
    if (patch.reason !== undefined) { sets.push(`reason = $${i++}`); values.push(patch.reason); }
    if (patch.scenesCompared !== undefined) { sets.push(`scenes_compared = $${i++}`); values.push(patch.scenesCompared); }
    if (patch.error !== undefined) { sets.push(`error = $${i++}`); values.push(patch.error); }
    sets.push(`updated_at = now()`);
    values.push(id);
    const { rows } = await this.pool.query<AnalysisRow>(
      `UPDATE analyses SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );
    return rows[0] ? rowToAnalysis(rows[0]) : null;
  }
}

interface GroundTruthRow {
  id: string;
  analysis_id: string;
  project_id: string;
  observed_change: number | null;
  observed_progress: number | null;
  notes: string | null;
  recorded_by: string | null;
  recorded_at: string;
}

function rowToGroundTruth(row: GroundTruthRow): GroundTruth {
  return {
    id: row.id,
    analysisId: row.analysis_id,
    projectId: row.project_id,
    observedChange: row.observed_change ?? undefined,
    observedProgress: row.observed_progress ?? undefined,
    notes: row.notes ?? undefined,
    recordedBy: row.recorded_by ?? undefined,
    recordedAt: new Date(row.recorded_at).toISOString(),
  };
}

export class PostgresGroundTruthRepository {
  constructor(private readonly pool: Pool) {}

  async create(projectId: string, input: GroundTruthCreate): Promise<GroundTruth> {
    const { rows } = await this.pool.query<GroundTruthRow>(
      `INSERT INTO ground_truths (id, analysis_id, project_id, observed_change, observed_progress, notes, recorded_by)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        input.analysisId,
        projectId,
        input.observedChange ?? null,
        input.observedProgress ?? null,
        input.notes ?? null,
        input.recordedBy ?? null,
      ],
    );
    return rowToGroundTruth(rows[0]!);
  }

  async listByProject(projectId: string): Promise<GroundTruth[]> {
    const { rows } = await this.pool.query<GroundTruthRow>(
      `SELECT * FROM ground_truths WHERE project_id = $1 ORDER BY recorded_at DESC`,
      [projectId],
    );
    return rows.map(rowToGroundTruth);
  }

  async listByAnalysis(analysisId: string): Promise<GroundTruth[]> {
    const { rows } = await this.pool.query<GroundTruthRow>(
      `SELECT * FROM ground_truths WHERE analysis_id = $1 ORDER BY recorded_at DESC`,
      [analysisId],
    );
    return rows.map(rowToGroundTruth);
  }
}

export class PostgresStore {
  readonly projects: PostgresProjectRepository;
  readonly ingestions: PostgresIngestionRepository;
  readonly analyses: PostgresAnalysisRepository;
  readonly groundTruths: PostgresGroundTruthRepository;

  constructor(private readonly pool: Pool) {
    this.projects = new PostgresProjectRepository(pool);
    this.ingestions = new PostgresIngestionRepository(pool);
    this.analyses = new PostgresAnalysisRepository(pool);
    this.groundTruths = new PostgresGroundTruthRepository(pool);
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
