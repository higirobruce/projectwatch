# MEMORY.md — ProjectWatch Rwanda

> Living project memory. Read this first on every session. Future agents: this file is the anti-context-loss mechanism — it records where we are, what was decided and why, and what to build next.

---

## Status

- **Phase:** 1 — Foundation (CLOSED · gate met · doc written); Phase 2 not started
- **Branch:** `dev` ✓ (main ✓) — feature branches off `dev`
- **Last updated:** 2026-07-08
- **MVP target:** Road construction monitoring
- **Hardware profile:** MacBook Air, M2, 16 GB RAM, Docker

---

## Progress

| Phase | Goal | Status | Gate |
|-------|------|--------|------|
| 1 — Foundation (0–3 mo) | Registry, GIS, ingestion, dashboard | 🔵 In progress | Live map + automated ingestion demo |
| 2 — Intelligence (3–6 mo) | Change detection, scoring, reporting | ⬜ Not started | Measurable change score vs. ground truth |
| 3 — Pilot (6–9 mo) | Real projects, validation, feedback | ⬜ Not started | ≥ 5 projects monitored + feedback report |

### Phase 1 — Deliverables done
- [x] **Repository scaffolding** (PR #1 → `dev`): monorepo, API registry, web skeleton, ingestion service, infra compose. Verified build/run/lint/typecheck on M2; ingestion Docker image builds/runs.
- [x] **Project Intelligence Registry API — PostGIS-backed** (PR #2 → `dev`): `projects` table (GEOMETRY 4326 + JSONB milestones), pg repository with GeoJSON round-trip, auto migration on boot, Dockerized API service. Verified persistence + geometry round-trip on M2.
- [x] **GIS boundary management + GeoServer layers** (PR #3 → `dev`): `infra/geoserver/provision.py` creates `projectwatch` workspace, PostGIS datastore, and publishes `projects` as WMS/WFS; `geoserver-setup` compose service auto-runs it. Verified live: layer + WMS GetMap PNG on M2. Switched GeoServer image to `kartoza/geoserver:2.25.2` (multi-arch/arm64) for smooth M2 boot.
- [x] **Initial dashboard (MapLibre GL)** (PR #3 → `dev`): `apps/web` `/projects` page renders OSM base + project GeoJSON boundaries with popups, side registry list, optional GeoServer WMS overlay toggle. Verified `next dev` serves `/` and `/projects` (200); `next build` passes with `NODE_ENV=production` (shell had non-standard NODE_ENV — pinned in build script).
- [x] **Satellite data integration (automated retrieval)** (PR #4 → `dev`): `ingestions` table + API (enqueue `POST /api/projects/:id/ingest`, list, worker `GET /pending` + `PATCH /:id`); Python `ingestion` worker (mock + STAC providers, rasterio clip/NDVI, MinIO staging) runs as a compose service. Verified end-to-end on M2: trigger → worker retrieves 2 scenes → preprocesses → stages to MinIO (objects confirmed) → job `done`.

**Phase 1 gate MET**: live map (dashboard) + automated ingestion demo both verified on M2. Phase 1 technical doc: `docs/phase-1-foundation.md` written.

---

## Key Documents

- `projectwatch.html` — concept proposal (v1.0)
- `implementation-plan.html` — phased implementation plan (v1.0)
- `AGENTS.md` — governance, branching, memory, tech stack
- `design-system.html` — Paper & Ink design system (used by all HTML docs)
- `docs/phase-1-foundation.md` — Phase 1 technical doc (to be created)
- `docs/phase-2-intelligence.md` — Phase 2 technical doc (to be created)
- `docs/phase-3-pilot.md` — Phase 3 technical doc (to be created)
- `docs/decisions.md` — decision log

---

## Decisions Log

See `docs/decisions.md`. Initial entries:

- **2026-07-08 — Memory store:** In-repo `MEMORY.md` + `docs/` chosen over external graph for continuity across agents. (Alt rejected: graphify-only — not clone-portable.)
- **2026-07-08 — PR review:** Coding agent self-reviews and merges to `dev`; user manually promotes `dev` → `main`. (Alt rejected: agent opens, user merges — slower loop.)
- **2026-07-08 — Local runtime:** Single-node Docker Compose (or k3s) + MinIO, not multi-node K8s, to fit M2/16 GB.

### PR history
- **PR #1** `feature/repo-scaffold` → `dev` (merged 2026-07-08): Phase 1 repo scaffolding. Self-reviewed; build/run/lint/typecheck + Docker verified on M2.
- **PR #2** `feature/project-registry-db` → `dev` (merged 2026-07-08): PostGIS-backed Project Registry. Self-reviewed; persistence + geometry round-trip verified on M2 + Docker.
- **PR #3** `feature/geoserver-layers` → `dev` (merged 2026-07-08): GIS boundaries + GeoServer layers + initial MapLibre dashboard. Self-reviewed; GeoServer provisioning + WMS verified live on M2; web build/dev verified.
- **PR #4** `feature/satellite-ingestion` → `dev` (merged 2026-07-08): Automated satellite ingestion. Self-reviewed; full stack (postgis+minio+api+ingestion) verified on M2 — trigger → 2 scenes retrieved → MinIO staged → job done. **Phase 1 CLOSED** — technical doc at `docs/phase-1-foundation.md`.

---

## Open Questions

- Which partner agency will supply pilot project boundaries (Phase 3)? Secure in Phase 1.
- Cloud vs. local compute for prototype — default local Docker on M2 to control cost.
- Naming convention for `feature/<name>` branches to be confirmed with first task.

---

## How to Continue

1. Read this file + linked `docs/`.
2. Create `dev` branch from `main` if not present.
3. Branch `feature/<name>` from `dev` for the next deliverable.
4. Implement within tech stack (AGENTS.md §4) and M2/Docker constraints (§4 constraints).
5. Self-review PR → merge to `dev` (§3). Update this file + `docs/decisions.md` on merge.
6. Close each phase with `docs/phase-<n>-<name>.md` (§7).
