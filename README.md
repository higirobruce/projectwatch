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
# 1. Start infrastructure (PostGIS, MinIO, GeoServer)
npm run infra:up

# 2. Run API + Web
npm install
npm run dev
```

Resource limits for the M2 profile are defined in `infra/docker-compose.yml`
(PostGIS + GeoServer + MinIO kept within ~12 GB RAM budget).

## Branching & workflow

- `main` — production (user-only PRs from `dev`).
- `dev` — integration; feature branches merge here via reviewed PRs.
- `feature/<name>` — one deliverable per branch.

See `AGENTS.md` for full governance, self-review, and phase-closure rules.
