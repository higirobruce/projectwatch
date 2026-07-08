# ProjectWatch Rwanda

AI-Powered Geospatial Intelligence Platform for Infrastructure Monitoring — MVP focused on **road construction monitoring**.

> Concept: `projectwatch.html` · Plan: `implementation-plan.html` · Governance: `AGENTS.md` · Memory: `MEMORY.md`

## Monorepo layout

```
apps/
  web/         Next.js + TypeScript frontend (MapLibre GL dashboard)
  api/         Node.js + TypeScript backend (project registry, APIs)
services/
  ingestion/   Python + GDAL/Rasterio satellite image processing
infra/         Docker Compose: PostGIS, MinIO, GeoServer (M2-friendly)
docs/          Phase technical docs + decisions log
```

## Tech stack (authoritative — see AGENTS.md §4)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js + TypeScript |
| Backend APIs | Node.js + TypeScript |
| AI / image processing | Python + GDAL + Rasterio + CV |
| Database | PostgreSQL + PostGIS |
| Object storage | MinIO (S3-compatible) |
| Maps | OpenStreetMap + MapLibre GL + GeoServer (OGC) |
| Auth | Keycloak / OpenID Connect (post-scaffold) |
| Deployment | Docker (single-node Compose on M2) |

## Local development (MacBook Air M2, 16 GB, Docker)

```bash
# 1. Start infrastructure (PostGIS, MinIO, GeoServer + auto-provisioning)
npm run infra:up

# 2. Run API + Web
npm install
npm run dev
```

- API: http://localhost:4000 (health at `/health`)
- Web dashboard: http://localhost:3000 → `/projects` (map of project boundaries)
- GeoServer: http://localhost:8080/geoserver (admin/geoserver) — publishes
  `projectwatch:projects` as WMS/WFS automatically via the `geoserver-setup` service.

### Automated satellite ingestion (Phase 1)

The `ingestion` worker polls the API for pending jobs and, for each project
boundary, retrieves satellite scenes, preprocesses them (clip + NDVI via
GDAL/Rasterio), and stages rasters to MinIO.

```bash
# 1. Bring up the stack (includes the ingestion worker)
npm run infra:up

# 2. Register a project
curl -X POST http://localhost:4000/api/projects -H 'Content-Type: application/json' \
  -d '{"name":"Kigali Feeder Road","timelineStart":"2026-01-01T00:00:00Z",
       "timelineEnd":"2027-07-01T00:00:00Z",
       "boundary":{"type":"Polygon","coordinates":[[[30.05,-1.95],[30.10,-1.95],[30.10,-1.99],[30.05,-1.99],[30.05,-1.95]]]}}'

# 3. Trigger ingestion for the project id
curl -X POST http://localhost:4000/api/projects/<PROJECT_ID>/ingest

# 4. Watch it process (worker runs every ~10s)
curl http://localhost:4000/api/projects/<PROJECT_ID>/ingestions
```

The default provider is `mock` (synthesizes rasters offline — smooth M2 testing).
Set `PROVIDER=stac` on the `ingestion` service for real retrieval from a public
STAC API (Element84 Earth Search) when network access is available.

Resource limits for the M2 profile are defined in `infra/docker-compose.yml`
(PostGIS + GeoServer + MinIO + API kept within ~12 GB RAM budget).

> Note: a local Homebrew Postgres on port 5432 can clash with the Docker
> PostGIS mapping; the compose file maps PostGIS to host port **5433**.

## Branching & workflow

- `main` — production (user-only PRs from `dev`).
- `dev` — integration; feature branches merge here via reviewed PRs.
- `feature/<name>` — one deliverable per branch.

See `AGENTS.md` for full governance, self-review, and phase-closure rules.
