# Phase 3 — Pilot Deployment · Technical Documentation

> Status: ✅ Foundation built (seed data, ground truth validation, scheduled analysis, alerting). Gate (≥ 5 projects monitored for ≥ 8 weeks) requires real partner agency data and stakeholder engagement.
> Covers the 6–9 month deliverables from the Implementation Plan.

## Goal

Run the platform against real road projects, validate accuracy with stakeholders, and feed learnings back into the models.

## Phase Gate

≥ 5 pilot road projects monitored for ≥ 8 weeks + written feedback report.

## What Was Built

| Area | Deliverable |
|------|-------------|
| Seed data | `004_seed_projects.sql` — 5 realistic Rwandan road projects (Kigali–Bugesera Highway, Musanze–Rubavu Corridor, Kigali Urban Ring Road, Huye–Nyamagabe Road, Rusumo–Kirehe Border Road) with proper boundaries, milestones, and statuses. Idempotent — seeds only if empty. |
| Ground truth validation | `005_ground_truths.sql` — `ground_truths` table (observed change, progress, notes, recorded_by). Postgres + in-memory repositories. Routes: `POST /api/ground-truths`, `GET /api/ground-truths/by-analysis/:id`, `GET /api/projects/:id/ground-truths`. |
| Validation UI | Dashboard `/dashboard` — `GroundTruthForm` component for recording field observations per analysis. Validation column shows AI vs. field score comparison with diff highlighting. |
| Scheduled analysis | `services/scheduler/worker.py` — polls all projects with ingested scenes, triggers analysis automatically. Configurable interval (default 6 hours). Runs as `pw-scheduler` container. |
| Alerting | Intelligence worker posts to `ALERT_WEBHOOK_URL` when risk is amber/red. Payload includes project name, risk level, change score, and reason. Configured via environment variable. |

## Architecture

```
   Scheduler (Python, 6h cron)
   GET /api/projects → POST /api/projects/:id/analyze
       |
       v
   Intelligence Worker (Python)
   GET /api/analyses/pending → engine → PATCH /api/analyses/:id
       |
       ├── if risk in (amber, red) → POST ALERT_WEBHOOK_URL
       v
   Field Observer (human)
   POST /api/ground-truths ← dashboard form
   GET  /api/projects/:id/ground-truths → validation UI
```

## How to Run (Docker)

```bash
# Full stack including scheduler
docker compose -f infra/docker-compose.yml up -d

# Web dashboard
npm run dev   # http://localhost:3000/dashboard

# Seed data auto-applies on API boot (idempotent — runs only if projects empty)

# Trigger manual analysis (if scheduler has not yet run)
curl -X POST http://localhost:4000/api/projects/a0000000-0000-0000-0000-000000000001/analyze \
  -H "Content-Type: application/json" \
  -d '{"projectId": "a0000000-0000-0000-0000-000000000001"}'

# Record a field observation
curl -X POST http://localhost:4000/api/ground-truths \
  -H "Content-Type: application/json" \
  -d '{
    "analysisId": "<ANALYSIS_UUID>",
    "observedChange": 0.35,
    "observedProgress": 50,
    "notes": "Paving in progress on section B",
    "recordedBy": "field-inspector-1"
  }'

# Enable alerting (optional)
# Add ALERT_WEBHOOK_URL to the intelligence service environment
```

## APIs / Endpoints

**Ground Truth (Phase 3 — all new)**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/ground-truths` | Record a field observation (linked to an analysis) |
| `GET` | `/api/ground-truths/by-analysis/:id` | List observations for a specific analysis |
| `GET` | `/api/projects/:id/ground-truths` | List observations for a project |

**Seed data (auto-applied)**

| Project | ID | Status |
|---------|-----|--------|
| Kigali–Bugesera Highway | `a000...001` | Earthworks in progress |
| Musanze–Rubavu Corridor | `a000...002` | Utility relocation |
| Kigali Urban Ring Road | `a000...003` | Detailed engineering done |
| Huye–Nyamagabe Road | `a000...004` | Paving in progress |
| Rusumo–Kirehe Border Road | `a000...005` | Route survey |

## Data Flows

1. **Seed:** API boot → `004_seed_projects.sql` runs (idempotent) → 5 projects with boundaries + milestones.
2. **Scheduled analysis:** Scheduler polls projects every 6h → skips projects with no ingested scenes → triggers `POST /api/projects/:id/analyze` → intelligence worker processes → results stored.
3. **Validation:** Field observer opens dashboard → sees AI analysis scores → records observed change/progress via `GroundTruthForm` → `POST /api/ground-truths` → dashboard shows AI vs. field comparison.
4. **Alerting:** Intelligence worker finishes analysis → if risk is amber/red → `POST ALERT_WEBHOOK_URL` with payload → external system (Slack, email, etc.) receives alert.

## Known Limitations

- Scheduler triggers analysis for all projects with ingested scenes, **including projects already analyzed**. No dedup beyond "if already pending, skip" (the API creates a new pending row each time).
- Alerting is a single webhook with no retry backoff beyond the worker's 15s polling interval.
- Ground truth requires manual data entry — no automated field data ingestion.
- Seed data uses fixed UUIDs for easy reference; conflicts only if manually inserted.
- Pre-existing `<Html>` Pages Router error during `next build` is cosmetic; dev server works.

## Linked Decisions

- See `docs/decisions.md` for full decision log.
