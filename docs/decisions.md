# Decisions Log — ProjectWatch Rwanda

> Append-only decision record. Every architectural, tooling, or scope decision goes here with rationale and rejected alternatives. Dated entries prevent context loss across agents.

---

## 2026-07-08 — Memory store

- **Decision:** Keep project memory in-repo (`MEMORY.md` + `docs/`), committed alongside code.
- **Why:** Any agent (or the user) cloning the repo gets full context; no external dependency.
- **Alternatives rejected:**
  - graphify-only knowledge graph — not clone-portable, harder to surface a quick status.
  - Both repo + graphify — deferred; can add later if relationship mapping proves valuable.

## 2026-07-08 — PR review model

- **Decision:** Coding agent self-reviews its PR and merges to `dev`; user manually promotes `dev` → `main`.
- **Why:** Fast feedback loop while keeping production `main` under user control.
- **Alternatives rejected:**
  - Agent opens PR, user merges — slower; user wanted agent-driven review per governance.

## 2026-07-08 — Local runtime profile

- **Decision:** Default to single-node Docker Compose (or k3s) + MinIO for local dev/testing.
- **Why:** Must run smoothly on MacBook Air M2 / 16 GB; multi-node K8s is out of budget.
- **Alternatives rejected:**
  - Full multi-node K8s — exceeds local RAM; unnecessary for MVP.
  - Cloud S3 for local testing — adds cost; MinIO mirrors the API.

---

## 2026-07-08 — Two design systems (Paper & Ink vs ProjectWatch Space)

- **Decision:** Use **Paper & Ink** for narrative/docs HTML (proposal, plan, phase docs, MEMORY/decisions) and **ProjectWatch Space** (dark, with a light optical view) for the application UI (web dashboard, intelligence UI, assistant). Documented in `design-system-space.html`; referenced from AGENTS.md §5.
- **Why:** The user wanted the app UI to have an exotic, satellite/space look (mostly dark, light review mode), distinct from the calm documentation system. Keeping Paper & Ink for docs preserves the established narrative style.
- **Alternatives rejected:**
  - Single Paper & Ink system for everything — too plain for the "orbital HUD" app intent.
  - Only a dark theme — user explicitly wanted a light optical-review variant.

---

<!-- New decisions go above this line, newest first. Format:

## YYYY-MM-DD — <title>
- **Decision:** ...
- **Why:** ...
- **Alternatives rejected:** ...
-->
