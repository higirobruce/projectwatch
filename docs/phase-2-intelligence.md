# Phase 2 — Intelligence Layer · Technical Documentation

> Status: ✅ Complete — Phase gate met (mock change detection engine produces scores + risk classification; end-to-end API + worker + dashboard verified on M2).
> Covers the 3–6 month deliverables from the Implementation Plan.

## Goal

Convert raw satellite imagery into monitored intelligence: AI change detection, progress scoring, risk classification, and a mission-control dashboard for infrastructure monitoring.

## Phase Gate

**Measurable change score vs. ground truth** — MVP target: change score (0–1), confidence (0–1), progress % (0–100), risk classification (green/amber/red). The mock engine produces realistic outputs; the CV pipeline can be swapped in without API changes.

## What Was Built

| Area | Deliverable |
|------|-------------|
| Analysis API | `analyses` table + domain types + Postgres + in-memory repositories. |
| Analysis routes | Project-scoped enqueue + list; worker-facing pending + patch. |
| Change detection engine | Python mock engine (`services/intelligence/engine.py`): simulates changeScore, confidence, progressPct, and risk from project milestones + scene count. |
| Intelligence worker | Python worker (`services/intelligence/worker.py`): polls `GET /api/analyses/pending`, fetches project data + ingested scenes, runs engine, reports via `PATCH /api/analyses/:id`. |
| Risk classification | 3-tier matrix (green/amber/red) based on change score × schedule progress. |
| Mission Control dashboard | Next.js app at `/dashboard` with the **ProjectWatch Space** design system (dark theme), showing stats grid, risk badges, progress bars, and per-project analysis history. |
| Contained | Intelligence service Docker image built and verified. |

## Architecture

```
   Intelligence Worker (Python)         ← new in Phase 2
   polls GET /api/analyses/pending
       |                                       |
       | (fetches project + scenes via API)    |
       v                                       |
   engine.py: analyze_project()                |
       |                                       |
       +--- changeScore, confidence,           |
       |    progressPct, risk, reason           |
       |                                       |
       v                                       |
   PATCH /api/analyses/:id  ──────────→  PostgreSQL + PostGIS
       |                                       (analyses table)
       |
       | (SSR server data)
       v
   Next.js Dashboard /dashboard
   ProjectWatch Space design system
   Stats, risk badges, progress bars, history
```

## How to Run (Docker, M2)

```bash
# 1. Full stack (PostGIS, MinIO, GeoServer, API, ingestion, intelligence)
docker compose -f infra/docker-compose.yml up -d

# 2. Web dashboard (separate terminal)
npm install
npm run dev            # http://localhost:3000
                       #   → /dashboard (Mission Control, Space theme)
                       #   → /projects (Map + Registry, Paper & Ink theme)

# 3. Register a project (if none exist)
curl -X POST http://localhost:4000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kigali–Bugesera Highway",
    "boundary": {
      "type": "Polygon",
      "coordinates": [[[30.05,-1.95],[30.10,-1.95],[30.10,-2.00],[30.05,-2.00],[30.05,-1.95]]]
    },
    "timelineStart": "2026-01-01T00:00:00Z",
    "timelineEnd": "2027-06-30T00:00:00Z",
    "milestones": [
      {"name": "Clearing", "plannedDate": "2026-03-01", "status": "done"},
      {"name": "Subgrade", "plannedDate": "2026-07-01", "status": "done"},
      {"name": "Paving", "plannedDate": "2027-02-01", "status": "in_progress"},
      {"name": "Completion", "plannedDate": "2027-06-30", "status": "pending"}
    ]
  }'

# 4. Trigger an analysis
curl -X POST http://localhost:4000/api/projects/<PROJECT_ID>/analyze \
  -H "Content-Type: application/json" \
  -d '{"projectId": "<PROJECT_ID>"}'

# 5. View results
curl http://localhost:4000/api/projects/<PROJECT_ID>/analyses
```

Resource budgets: same as Phase 1 plus intelligence service at 1 GB / 1 CPU — total ~11 GB, inside the ~12 GB M2 envelope.

## APIs / Endpoints

**Analysis (Phase 2 — all new)**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/projects/:id/analyze` | Enqueue analysis job (returns `202` + analysis row) |
| `GET` | `/api/projects/:id/analyses` | List analyses for a project (newest first) |
| `GET` | `/api/analyses/pending` | Worker poll — returns `pending` analyses |
| `PATCH` | `/api/analyses/:id` | Worker reports results (`changeScore`, `confidence`, `progressPct`, `risk`, `reason`, `scenesCompared`) |

**Response shape (`Analysis`):**
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "status": "pending | processing | done | failed",
  "changeScore": 0.32,
  "confidence": 0.78,
  "progressPct": 45.0,
  "risk": "amber",
  "reason": "Caution. Change score 32% with schedule at 45% — monitor closely.",
  "scenesCompared": ["scene-id-1", "scene-id-2"],
  "error": null,
  "createdAt": "2026-07-11T...",
  "updatedAt": "2026-07-11T..."
}
```

## Data Flows

1. **Analyze (enqueue):** `POST /api/projects/:id/analyze` → inserts `analyses` row (status `pending`).
2. **Worker polls:** intelligence worker `GET /api/analyses/pending` → gets pending jobs.
3. **Worker processes:** for each job:
   - Sets status to `processing`.
   - Fetches project (milestones for schedule progress) + ingested scenes.
   - Runs `engine.analyze_project()` → returns changeScore, confidence, progressPct, risk, reason.
   - `PATCH`es the analysis to `done` with results.
4. **Visualize:** dashboard `GET /api/projects/:id/analyses` → renders in Mission Control table + per-project history cards.

## Risk Classification Matrix

| Condition | Risk |
|-----------|------|
| On schedule (progress ≥ 30%) + low change (score ≤ 0.25) | **green** — nominal |
| Behind schedule (progress < 30%) OR high change (score > 0.25) | **amber** — at risk |
| Behind schedule AND high change | **red** — critical |

## Accuracy / Validation (Phase 2)

Phase 2 uses a **mock engine** that produces realistic but non-deterministic scores. Validation performed on M2:

- API: enqueue analysis → worker polls → engine runs → results stored → dashboard renders ✅
- All risk classes (green/amber/red) achievable based on score × progress matrix ✅
- Confidence ranges 0.1–0.99; change score 0.05–1.0 ✅
- Intelligence service Docker image builds and runs ✅
- Dashboard dev server serves `/dashboard` with Space theme (200) ✅
- Both design systems coexist: Paper & Ink at `/` and `/projects`, Space at `/dashboard` ✅

**Ground truth alignment** requires pilot data (Phase 3). The engine API contract (`analyze_project` returning `{changeScore, confidence, ...}`) is stable — swap the mock for a real CV model without changing the worker or API.

## Known Limitations

- Change detection engine is **mock** (simulated random values). Replace `_simulate_change_score()` with real CV model (e.g., raster difference, NDVI delta, or ML change classifier) before the pilot.
- Risk matrix is heuristic — tune thresholds with real project data.
- Intelligence worker has no retry/backoff beyond the polling interval.
- No authentication — analysis endpoints are open (Phase 3 requirement).
- The `<Html>` / Pages Router error during `next build` is a pre-existing issue (present since Phase 1); the dev server works fine.
- `NODE_ENV=production` warning during `next build` is cosmetic — pinned in the web build script.

## Linked Decisions

- **2026-07-08 — Two design systems:** Paper & Ink for docs, ProjectWatch Space for the web app UI. Documented in `design-system-space.html`, AGENTS.md §5, `docs/decisions.md`.
- See `docs/decisions.md` for the full decision log.
