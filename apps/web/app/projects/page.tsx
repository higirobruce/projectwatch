import Link from "next/link";
import ProjectMap, { type MapProject } from "../components/ProjectMap";
import { listProjects } from "../lib/projects";

export const dynamic = "force-dynamic";

// GeoServer WMS base (OGC). Set to empty to skip the overlay toggle.
const GEOSERVER_WMS =
  process.env.GEOSERVER_WMS ?? "http://localhost:8080/geoserver/projectwatch/wms";

export default async function ProjectsPage() {
  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  let loadError: string | null = null;
  try {
    projects = await listProjects();
  } catch {
    loadError = "Unable to reach the ProjectWatch API. Start it with `npm run dev`.";
  }

  const mapProjects: MapProject[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    boundary: p.boundary,
    timelineStart: p.timelineStart,
    timelineEnd: p.timelineEnd,
    milestones: p.milestones,
  }));

  return (
    <main className="page">
      <p className="eyebrow">ProjectWatch Rwanda · Dashboard</p>
      <h1 className="display-1" style={{ fontSize: 48 }}>Projects Map</h1>
      <p className="lead">
        Registered road-construction projects and their GIS boundaries, rendered from the
        Project Intelligence Registry. GeoServer exposes the same data as an OGC WMS/WFS layer.
      </p>
      <div className="row">
        <Link className="btn" href="/">← Home</Link>
        <span className="tag">Phase 1 · GIS</span>
      </div>

      <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1fr 280px", gap: 24 }}>
        <section>
          {loadError ? (
            <div className="card"><p className="muted">{loadError}</p></div>
          ) : (
            <ProjectMap projects={mapProjects} wmsUrl={GEOSERVER_WMS} />
          )}
        </section>
        <aside>
          <div className="card">
            <p className="eyebrow">Registry</p>
            {projects.length === 0 ? (
              <p className="muted">No projects yet. Register one via <code>POST /api/projects</code>.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {projects.map((p) => (
                  <li key={p.id} style={{ marginBottom: 12, fontSize: 14 }}>
                    <strong>{p.name}</strong>
                    <br />
                    <span className="muted">
                      {p.milestones.length} milestones · {p.timelineStart.slice(0, 10)} → {p.timelineEnd.slice(0, 10)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
