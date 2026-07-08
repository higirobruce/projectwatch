# Phase 1 — Foundation · Technical Documentation

> Status: ✅ Complete — Phase gate met (live map + automated ingestion demo verified on M2).
> Covers the first 0–3 month deliverables from the Implementation Plan.

## Goal

Stand up the ProjectWatch Rwanda platform backbone: a project registry with GIS
boundaries, automated satellite ingestion, an initial map dashboard, and the
local infrastructure to run it all smoothly on a MacBook Air (M2, 16 GB, Docker).

## What Was Built

| Area | Deliverable |
|------|-------------|
| Platform | Monorepo (npm workspaces): `apps/web`, `apps/api`, `services/ingestion`, `infra`. |
| Registry | Project Intelligence Registry API (Node.js + TS + PostGIS). |
| GIS | Boundaries stored as `GEOMETRY(POLYGON, 4326)`; published to GeoServer as OGC WMS/WFS. |
| Ingestion | Python worker (GDAL/Rasterio + boto3) retrieves, preprocesses, and stages satellite rasters to MinIO. |
| Dashboard | Next.js + MapLibre GL map of project boundaries with ingestion status. |
| Infra | `docker-compose.yml`: PostGIS, MinIO, GeoServer, API, ingestion worker (M2 resource limits). |

## Architecture

```
                Satellite Sources (Sentinel-1/2, Landsat)
                          |
                Image Processing Pipeline
                (Python + GDAL + Rasterio)   ← services/ingestion
                          |
        +-----------------+------------------+
        v                                    v
  PostgreSQL + PostGIS                   Object Storage (MinIO)
  Vector: projects, ingestions          Raster: processed scenes
        ^                                    ^
        | (DATABASE_URL)                   | (S3 API)
        v                                    v
   Node.js API (Express/TS)  <--- polls ---  Ingestion Worker
   /api/projects, /api/ingestions           (mock + STAC providers)
        ^
        | (HTTP / rewrites)
        v
   Next.js Dashboard (MapLibre GL)
   /projects: map + registry + ingestion status
                     |
              GeoServer (OGC WMS/WFS)  ← auto-provisioned from PostGIS
```

## How to Run (Docker, M2)

```bash
# 1. Start infrastructure + services (PostGIS, MinIO, GeoServer, API, ingestion)
docker compose -f infra/docker-compose.yml up -d

# 2. Run the web dashboard (separate, via npm workspaces)
npm install
npm run dev            # http://localhost:3000  → /projects

# 3. (Optional) Trigger ingestion for a project
curl -X POST http://localhost:4000/api/projects/<PROJECT_ID>/ingest
```

Resource budgets (per `infra/docker-compose.yml`): PostGIS 2 GB, GeoServer 4 GB,
MinIO 1 GB, API 1 GB, ingestion 2 GB — total ~10 GB, inside the ~12 GB M2 envelope.

## APIs / Endpoints

**Project Registry** (`apps/api`)
- `GET  /api/projects` — list projects
- `GET  /api/projects/:id` — get project (includes GeoJSON `boundary`)
- `POST /api/projects` — register project (`name`, `boundary`, timeline, milestones)

**Satellite Ingestion**
- `POST /api/projects/:id/ingest` — enqueue an ingestion job (status `pending`)
- `GET  /api/projects/:id/ingestions` — list ingestion jobs for a project
- `GET  /api/ingestions/pending` — worker poll endpoint
- `PATCH /api/ingestions/:id` — worker reports status / scenes / errors

**Health**
- `GET /health` → `{ status, service, storage: "postgis" | "memory" }`

## Data Flows

1. **Register:** client → `POST /api/projects` → PostGIS `projects` row (geometry + JSONB milestones).
2. **Ingest (automated):** `POST /api/projects/:id/ingest` → pending row →
   ingestion worker polls, fetches the boundary, retrieves scenes (mock or STAC),
   clips/reprojects with Rasterio (computes NDVI), uploads processed rasters to
   MinIO, then `PATCH`es the job to `done` with scene metadata.
3. **Visualize:** dashboard fetches projects + ingestions from the API; MapLibre
   renders boundaries; GeoServer (optional WMS overlay) serves the same data via OGC.

## Ingestion Providers

- **Mock** (default, `PROVIDER=mock`): synthesizes multi-band rasters locally —
  fully offline, ideal for M2 testing. Verified: 2 scenes/clip/NDVI/MinIO upload.
- **STAC** (`PROVIDER=stac`): real retrieval from a public STAC API
  (Element84 Earth Search) for Sentinel-2 L2A, filtered by boundary bbox + cloud
  cover. Requires network access.

## Accuracy / Validation (Phase 1)

Phase 1 is foundation-only; no AI change-detection accuracy yet (that is Phase 2).
Validation performed on M2:
- API persistence + GeoJSON geometry round-trip ✅
- GeoServer workspace/datastore/layer provisioning + WMS GetMap PNG ✅
- Full ingestion loop: trigger → 2 scenes → MinIO objects confirmed → job `done` ✅
- Dashboard renders map + ingestion status ✅

## Known Limitations

- In-memory repository is a non-persistent fallback when `DATABASE_URL` is unset.
- Migrations run on every boot (idempotent `IF NOT EXISTS`); add versioned
  migrations / a migrate tool before the pilot.
- GeoServer is the heaviest service; on M2 it boots under arm64 (kartoza image)
  in ~3 min. The dashboard does not depend on it (falls back to API GeoJSON).
- AI change detection, progress scoring, and risk classification are Phase 2.
- `next build` requires `NODE_ENV=production` (pinned in the web build script);
  the dev shell had a non-standard `NODE_ENV`.

## Linked Decisions

- See `docs/decisions.md` and `MEMORY.md` for the Phase 1 decision log.
