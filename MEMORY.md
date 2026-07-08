# MEMORY.md — ProjectWatch Rwanda

> Living project memory. Read this first on every session. Future agents: this file is the anti-context-loss mechanism — it records where we are, what was decided and why, and what to build next.

---

## Status

- **Phase:** Not started (Pre-implementation)
- **Branch:** `main` (no `dev` yet — create before first feature work)
- **Last updated:** 2026-07-08
- **MVP target:** Road construction monitoring
- **Hardware profile:** MacBook Air, M2, 16 GB RAM, Docker

---

## Progress

| Phase | Goal | Status | Gate |
|-------|------|--------|------|
| 1 — Foundation (0–3 mo) | Registry, GIS, ingestion, dashboard | ⬜ Not started | Live map + automated ingestion demo |
| 2 — Intelligence (3–6 mo) | Change detection, scoring, reporting | ⬜ Not started | Measurable change score vs. ground truth |
| 3 — Pilot (6–9 mo) | Real projects, validation, feedback | ⬜ Not started | ≥ 5 projects monitored + feedback report |

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
