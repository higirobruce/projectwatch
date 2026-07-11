import Link from "next/link";
import { listProjects, type Project } from "../lib/projects";
import { listAnalyses, type Analysis } from "../lib/analyses";
import { listGroundTruths, type GroundTruth } from "../lib/ground_truths";
import { RunAnalysisButton } from "./RunAnalysisButton";
import { GroundTruthForm } from "./GroundTruthForm";

export const dynamic = "force-dynamic";

function RiskBadge({ risk }: { risk: Analysis["risk"] }) {
  if (!risk) return <span className="badge badge-amber" style={{ opacity: 0.5 }}>—</span>;
  const labels = { green: "Nominal", amber: "At Risk", red: "Critical" };
  return <span className={`badge badge-${risk}`}>{labels[risk]}</span>;
}

function StatusTag({ status }: { status: Analysis["status"] }) {
  const labels: Record<string, string> = {
    pending: "Queued",
    processing: "Processing…",
    done: "Complete",
    failed: "Failed",
  };
  return <span className="tag">{labels[status] ?? status}</span>;
}

function ProgressBar({ pct }: { pct: number | null | undefined }) {
  const v = pct ?? 0;
  const hue = v > 70 ? "var(--risk-green)" : v > 30 ? "var(--risk-amber)" : "var(--risk-red)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--space-700)", overflow: "hidden" }}>
        <div style={{ width: `${v}%`, height: "100%", borderRadius: 3, background: hue, transition: "width 0.3s" }} />
      </div>
      <span className="stat-value" style={{ fontSize: "var(--t-14)" }}>{v.toFixed(0)}%</span>
    </div>
  );
}

function ValidationDiff({ ai, observed }: { ai?: number | null; observed?: number | null }) {
  if (ai == null && observed == null) return <span className="muted">—</span>;
  const aiVal = ai ?? 0;
  const obsVal = observed ?? 0;
  const diff = Math.abs(aiVal - obsVal);
  const ok = diff < 0.15;
  return (
    <span className="caption" style={{ color: ok ? "var(--risk-green)" : "var(--risk-amber)" }}>
      AI: {(aiVal * 100).toFixed(0)}% &nbsp; Field: {(obsVal * 100).toFixed(0)}%
    </span>
  );
}

export default async function DashboardPage() {
  let projects: Project[] = [];
  let analysesByProject: Record<string, Analysis[]> = {};
  let groundTruthsByProject: Record<string, GroundTruth[]> = {};
  let error: string | null = null;

  try {
    projects = await listProjects();
    const [allAnalyses, allGroundTruths] = await Promise.all([
      Promise.all(projects.map((p) => listAnalyses(p.id).catch(() => [] as Analysis[]))),
      Promise.all(projects.map((p) => listGroundTruths(p.id).catch(() => [] as GroundTruth[]))),
    ]);
    analysesByProject = Object.fromEntries(projects.map((p, i) => [p.id, allAnalyses[i]!]));
    groundTruthsByProject = Object.fromEntries(projects.map((p, i) => [p.id, allGroundTruths[i]!]));
  } catch {
    error = "Unable to reach the ProjectWatch API. Start it with `npm run dev`.";
  }

  return (
    <div className="page">
      <p className="eyebrow">ProjectWatch · Intelligence</p>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 className="display-1" style={{ fontSize: "var(--t-48)" }}>Mission Control</h1>
          <p className="lead" style={{ marginTop: 8 }}>
            Change detection, progress tracking &amp; risk classification across all projects.
          </p>
        </div>
        <Link className="btn btn-ghost" href="/projects" target="_blank">Map view →</Link>
      </div>

      {error ? (
        <div className="card" style={{ marginTop: 32 }}>
          <p className="muted">{error}</p>
        </div>
      ) : (
        <div style={{ marginTop: 32 }}>
          {/* Summary stats */}
          <div className="grid grid-4" style={{ marginBottom: 32 }}>
            <div className="card">
              <div className="stat">
                <span className="stat-value">{projects.length}</span>
                <span className="stat-label">Projects</span>
              </div>
            </div>
            <div className="card">
              <div className="stat">
                <span className="stat-value" style={{ color: "var(--risk-green)" }}>
                  {projects.filter((p) => analysesByProject[p.id]?.[0]?.risk === "green").length}
                </span>
                <span className="stat-label">Green · nominal</span>
              </div>
            </div>
            <div className="card">
              <div className="stat">
                <span className="stat-value" style={{ color: "var(--risk-amber)" }}>
                  {projects.filter((p) => analysesByProject[p.id]?.[0]?.risk === "amber").length}
                </span>
                <span className="stat-label">Amber · caution</span>
              </div>
            </div>
            <div className="card">
              <div className="stat">
                <span className="stat-value" style={{ color: "var(--risk-red)" }}>
                  {projects.filter((p) => analysesByProject[p.id]?.[0]?.risk === "red").length}
                </span>
                <span className="stat-label">Red · critical</span>
              </div>
            </div>
          </div>

          {/* Project analysis table */}
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Status</th>
                <th>Risk</th>
                <th>Change</th>
                <th>Confidence</th>
                <th>Progress</th>
                <th>Reason</th>
                <th>Validation</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>
                    No projects registered. Create one via <code>POST /api/projects</code> or the home page.
                  </td>
                </tr>
              ) : (
                projects.map((p) => {
                  const analyses = analysesByProject[p.id] ?? [];
                  const latest = analyses[0];
                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.name}</strong>
                        <div className="caption">{p.timelineStart.slice(0, 10)} → {p.timelineEnd.slice(0, 10)}</div>
                      </td>
                      <td>{latest ? <StatusTag status={latest.status} /> : <span className="tag">—</span>}</td>
                      <td>{latest ? <RiskBadge risk={latest.risk} /> : <span className="badge" style={{ opacity: 0.3 }}>—</span>}</td>
                      <td>
                        {latest?.changeScore != null
                          ? <span className="stat-value" style={{ fontSize: "var(--t-16)" }}>{(latest.changeScore * 100).toFixed(0)}%</span>
                          : <span className="muted">—</span>}
                      </td>
                      <td>
                        {latest?.confidence != null
                          ? <span className="caption">{(latest.confidence * 100).toFixed(0)}%</span>
                          : <span className="muted">—</span>}
                      </td>
                      <td style={{ minWidth: 160 }}>
                        <ProgressBar pct={latest?.progressPct} />
                      </td>
                      <td>
                        <span className="caption">{latest?.reason ?? "—"}</span>
                        {latest?.error && <span className="caption" style={{ color: "var(--risk-red)" }}>{latest.error}</span>}
                      </td>
                      <td>
                        {(() => {
                          const gts = groundTruthsByProject[p.id] ?? [];
                          const gt = gts[0];
                          return gt ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <ValidationDiff ai={latest?.changeScore} observed={gt.observedChange} />
                              {gt.notes && <span className="caption">{gt.notes.slice(0, 60)}</span>}
                            </div>
                          ) : <span className="muted">—</span>;
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Analysis history per project */}
          <div style={{ marginTop: 48 }}>
            <h2>Analysis History</h2>
            {projects.length === 0 ? (
              <p className="muted">No projects to show.</p>
            ) : (
              projects.map((p) => {
                const analyses = analysesByProject[p.id] ?? [];
                return (
                  <div key={p.id} className="card" style={{ marginTop: 16 }}>
                    <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                      <h4 style={{ margin: 0 }}>{p.name}</h4>
                      <RunAnalysisButton projectId={p.id} />
                    </div>
                    {analyses.length === 0 ? (
                      <p className="muted" style={{ margin: 0 }}>No analyses yet. Click &quot;Run analysis&quot; to start.</p>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Risk</th>
                            <th>Change</th>
                            <th>Confidence</th>
                            <th>Progress</th>
                            <th>Validation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyses.map((a) => {
                            const gts = (groundTruthsByProject[p.id] ?? []).filter((g) => g.analysisId === a.id);
                            return (
                              <tr key={a.id}>
                                <td className="caption">{new Date(a.createdAt).toLocaleDateString()}</td>
                                <td><StatusTag status={a.status} /></td>
                                <td><RiskBadge risk={a.risk} /></td>
                                <td>{a.changeScore != null ? `${(a.changeScore * 100).toFixed(0)}%` : "—"}</td>
                                <td>{a.confidence != null ? `${(a.confidence * 100).toFixed(0)}%` : "—"}</td>
                                <td><ProgressBar pct={a.progressPct} /></td>
                                <td>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {gts.map((gt) => (
                                      <div key={gt.id} style={{ fontSize: "var(--t-12)" }}>
                                        <ValidationDiff ai={a.changeScore} observed={gt.observedChange} />
                                      </div>
                                    ))}
                                    <GroundTruthForm analysisId={a.id} projectId={p.id} />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
