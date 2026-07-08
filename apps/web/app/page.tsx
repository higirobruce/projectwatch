import Link from "next/link";
import { listProjects } from "./lib/projects";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  let loadError: string | null = null;
  try {
    projects = await listProjects();
  } catch {
    loadError = "Unable to reach the ProjectWatch API. Start it with `npm run dev`.";
  }

  return (
    <main className="page">
      <p className="eyebrow">ProjectWatch Rwanda · MVP</p>
      <h1 className="display-1">Infrastructure<br />Intelligence</h1>
      <p className="lead">
        AI-powered geospatial monitoring for road construction. Registered projects and their
        GIS boundaries will render on a live map here.
      </p>
      <div className="row">
        <Link className="btn" href="/projects">View projects</Link>
        <span className="tag">Phase 1 · Foundation</span>
      </div>

      {loadError ? (
        <div className="card">
          <p className="muted">{loadError}</p>
        </div>
      ) : (
        <div className="card">
          <p className="eyebrow">Registered projects</p>
          {projects.length === 0 ? (
            <p className="muted">No projects yet. Register one via the API: <code>POST /api/projects</code>.</p>
          ) : (
            <ul>
              {projects.map((p) => (
                <li key={p.id}>
                  <strong>{p.name}</strong>{" "}
                  <span className="muted">
                    ({p.milestones.length} milestones · {p.timelineStart.slice(0, 10)} → {p.timelineEnd.slice(0, 10)})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
