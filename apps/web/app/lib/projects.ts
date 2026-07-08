export interface Project {
  id: string;
  name: string;
  description?: string;
  boundary: {
    type: "Polygon";
    coordinates: [number, number][][];
  };
  timelineStart: string;
  timelineEnd: string;
  milestones: { name: string; plannedDate: string; status: string }[];
  createdAt: string;
  updatedAt: string;
}

export async function listProjects(): Promise<Project[]> {
  const res = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/projects`);
  if (!res.ok) throw new Error("Failed to load projects");
  const data = (await res.json()) as { projects: Project[] };
  return data.projects;
}
