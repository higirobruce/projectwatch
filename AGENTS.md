# AGENTS.md — ProjectWatch Rwanda

Governance and working rules for implementing the ProjectWatch Rwanda MVP (AI-Powered Geospatial Intelligence Platform for Infrastructure Monitoring).

> Companion documents: `projectwatch.html` (concept proposal), `implementation-plan.html` (phased plan).

---

## 1. Project Context

ProjectWatch Rwanda transforms satellite imagery, GIS data, and project information into actionable infrastructure-monitoring intelligence. The MVP focuses on **road construction monitoring**.

The MVP must be **testable smoothly on a MacBook Air (16 GB RAM, Apple M2)** using Docker. Every architectural and tooling decision is filtered through this constraint (see §5).

---

## 2. Repository & Branching Workflow

The repository lives on GitHub. All feature work follows a branch-per-feature + PR model.

- `main` — production-stable. **Only the user creates PRs from `dev` → `main`.** Agents never merge to `main`.
- `dev` — integration branch. Feature branches are merged here via reviewed PRs.
- `feature/<short-name>` — one branch per unit of work (a deliverable, a task, a bugfix).

### Rules

1. Start every piece of work from an up-to-date `dev`:
   `git switch dev && git pull --ff-only && git switch -c feature/<name>`
2. Keep branches small and scoped to a single deliverable from the implementation plan.
3. Commit often with clear, imperative messages (`add sat ingestion worker`, `wire project registry API`).
4. Before opening a PR: rebase onto latest `dev`, ensure it builds/runs in Docker, and self-review (see §3).
5. Open a PR **`feature/<name>` → `dev`**. Do not merge to `main`.
6. After merge, delete the feature branch.

---

## 3. Pull Request Review (Agent Self-Review)

Per project decision, the coding agent reviews its own PR before merging to `dev`.

Before merging a PR to `dev`, the agent MUST:

1. **Build & run** the change inside Docker on the target machine profile (M2 / 16 GB). Confirm no regressions.
2. **Lint & typecheck** (per stack tooling in §4). Zero errors.
3. **Diff review** the PR as if a reviewer: check for secrets, dead code, scope creep, and偏离 the deliverable.
4. **Verify the deliverable** maps to the relevant phase item in `implementation-plan.html`.
5. **Update memory** (§6) if the PR introduces a decision, changes architecture, or alters progress.
6. Post a concise PR summary: what changed, how tested, what to watch for.
7. Only then merge to `dev`.

If a review finds a blocker, fix it on the branch and re-review — do not merge broken work.

---

## 4. Tech Stack (Authoritative)

Implement strictly within this stack. Do not introduce new primary technologies without user approval.

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js + TypeScript |
| Backend APIs | Node.js + TypeScript |
| AI Processing | Python + Computer Vision models |
| Image processing | Python + GDAL + Rasterio |
| Database | PostgreSQL + PostGIS |
| Object storage | S3-compatible / MinIO |
| Maps | OpenStreetMap + MapLibre GL + GeoServer (OGC services) |
| Spatial data | PostGIS (vectors), object storage (rasters) |
| Auth | Keycloak / OpenID Connect |
| Deployment | Docker + Kubernetes (single-node / k3s acceptable for MVP) |
| Analytics | ELK Stack / BI tools (post-MVP) |
| Satellite sources | Sentinel-1, Sentinel-2, Landsat (open feeds) |

### MacBook Air (M2, 16 GB) constraints

- Default to **single-node Docker Compose** (or k3s) for local dev — not a full multi-node K8s cluster.
- Use **MinIO** instead of cloud S3 for local testing.
- Keep PostGIS + GeoServer + app containers within ~12 GB RAM budget; document resource limits in `docker-compose.yml`.
- Prefer lightweight CV baselines (threshold + small model) over heavy training workloads on-device.

---

## 5. Design & Documentation Conventions

Two design systems, by artifact type:

- **Narrative docs (proposal, plan, phase docs, MEMORY/decisions):** use the **Paper & Ink** design system (`design-system.html` — `--paper`, `--ink`, `--azure`, serif display headings, mono eyebrow labels).
- **Application UI (web app: dashboard, intelligence UI, AI assistant):** use the **ProjectWatch Space** design system (`design-system-space.html`) — a satellite ground-station / orbital HUD. Mostly **dark** (deep space) with a **light optical-review view** (`[data-theme="light"]`). Tokens: `--space-*`, `--aurora` (primary signal), `--violet` (spectral), `--risk-green/amber/red` (project health), mono display for telemetry. Default theme is dark; the light view is for daylight/optical review.
- Code style: TypeScript strict mode; Python typed where practical; follow existing repo conventions once code exists.

---

## 6. Memory & Continuity (Cross-Agent)

Project memory is kept **in-repo** so any agent (or the user) cloning the repo has full context. The source of truth is:

- **`MEMORY.md`** — living project memory: current phase, progress, open decisions, and links to detailed notes.

Maintain it continuously:

1. **On every phase start:** record the phase, its goal, and the deliverables being worked.
2. **On every decision:** append to the Decisions log (what was decided, why, alternatives rejected, date). This is the anti-context-loss mechanism — future agents read it instead of re-deriving.
3. **On every PR merge to `dev`:** update progress (deliverables done, what's next).
4. **On blockers/assumptions:** note them so they aren't rediscovered.
5. **Link, don't duplicate:** `MEMORY.md` points to `docs/phase-*.md` for depth.

### Memory structure (recommended)

```
MEMORY.md              # index: phase, progress, decisions, open questions
docs/
  phase-1-foundation.md
  phase-2-intelligence.md
  phase-3-pilot.md
  decisions.md         # or inline in MEMORY.md
```

A future agent should be able to read `MEMORY.md` and immediately know: where we are, what was decided and why, and what to build next.

---

## 7. Phase Closure & Technical Documentation

Each phase MUST close with a **technical documentation** deliverable before the next phase begins:

- `docs/phase-<n>-<name>.md` covering: what was built, architecture decisions, how to run it (Docker), APIs/endpoints, data flows, accuracy/validation results (Phase 2+), and known limitations.
- Update `MEMORY.md` progress and the Decisions log.
- The phase is considered **closed** only when its doc exists, the code runs in Docker on the M2 profile, and the implementation-plan gate is met.

Phase gates (from implementation plan):
- **Phase 1 (Foundation, 0–3 mo):** live map + automated ingestion demo.
- **Phase 2 (Intelligence, 3–6 mo):** measurable change score vs. ground truth.
- **Phase 3 (Pilot, 6–9 mo):** ≥ 5 projects monitored + feedback report.

---

## 8. Agent Operating Checklist (per task)

1. Read `MEMORY.md` (and linked docs) first — never assume prior context.
2. Branch from `dev`; scope to one deliverable.
3. Implement within the tech stack and M2/Docker constraints.
4. Run/build in Docker; lint; typecheck.
5. Write/update technical doc for the phase if closing it.
6. Self-review PR; update `MEMORY.md`; open PR → `dev`; merge only after review passes.
7. Never touch `main`.

---

## 9. Out of Scope (MVP)

Proprietary data contracts, multi-node production K8s, heavy model training on-device, non-road monitoring domains (environment/agriculture/disaster intelligence are future expansion — see proposal §17).
