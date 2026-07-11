"use client";

import { useRouter } from "next/navigation";
import { triggerAnalysis } from "../lib/analyses";

export function RunAnalysisButton({ projectId }: { projectId: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      className="btn btn-primary"
      style={{ fontSize: "var(--t-12)", padding: "6px 12px" }}
      onClick={async () => {
        await triggerAnalysis(projectId);
        router.refresh();
      }}
    >
      + Run analysis
    </button>
  );
}
