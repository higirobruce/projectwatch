export interface GroundTruth {
  id: string;
  analysisId: string;
  projectId: string;
  observedChange?: number | null;
  observedProgress?: number | null;
  notes?: string | null;
  recordedBy?: string | null;
  recordedAt: string;
}

export interface GroundTruthCreate {
  analysisId: string;
  observedChange?: number;
  observedProgress?: number;
  notes?: string;
  recordedBy?: string;
}

export async function listGroundTruths(projectId: string): Promise<GroundTruth[]> {
  const res = await fetch(
    `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/projects/${projectId}/ground-truths`,
  );
  if (!res.ok) throw new Error("Failed to load ground truths");
  const data = (await res.json()) as { groundTruths: GroundTruth[] };
  return data.groundTruths;
}

export async function createGroundTruth(input: GroundTruthCreate): Promise<GroundTruth> {
  const res = await fetch(
    `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/ground-truths`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
  );
  if (!res.ok) throw new Error("Failed to create ground truth");
  return res.json() as Promise<GroundTruth>;
}
