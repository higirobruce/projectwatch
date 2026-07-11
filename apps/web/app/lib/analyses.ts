export interface Analysis {
  id: string;
  projectId: string;
  status: "pending" | "processing" | "done" | "failed";
  changeScore?: number | null;
  confidence?: number | null;
  progressPct?: number | null;
  risk?: "green" | "amber" | "red" | null;
  reason?: string | null;
  scenesCompared: string[];
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listAnalyses(projectId: string): Promise<Analysis[]> {
  const res = await fetch(
    `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/projects/${projectId}/analyses`,
  );
  if (!res.ok) throw new Error("Failed to load analyses");
  const data = (await res.json()) as { analyses: Analysis[] };
  return data.analyses;
}

export async function triggerAnalysis(projectId: string): Promise<Analysis> {
  const res = await fetch(
    `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/projects/${projectId}/analyze`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) },
  );
  if (!res.ok) throw new Error("Failed to trigger analysis");
  return res.json() as Promise<Analysis>;
}
