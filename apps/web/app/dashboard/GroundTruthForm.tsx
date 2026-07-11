"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGroundTruth } from "../lib/ground_truths";

export function GroundTruthForm({ analysisId, projectId }: { analysisId: string; projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!open) {
    return <button className="btn btn-ghost" style={{ fontSize: "var(--t-12)", padding: "4px 10px" }} onClick={() => setOpen(true)}>Record field observation</button>;
  }

  return (
    <form
      className="card"
      style={{ marginTop: 8, padding: "var(--s-4)", display: "grid", gap: "var(--s-3)", gridTemplateColumns: "1fr 1fr" }}
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        await createGroundTruth({
          analysisId,
          observedChange: fd.get("observedChange") ? Number(fd.get("observedChange")) : undefined,
          observedProgress: fd.get("observedProgress") ? Number(fd.get("observedProgress")) : undefined,
          notes: (fd.get("notes") as string) || undefined,
          recordedBy: (fd.get("recordedBy") as string) || undefined,
        });
        router.refresh();
        setOpen(false);
      }}
    >
      <label className="caption" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        Observed change (0–1)
        <input name="observedChange" type="number" step="0.01" min="0" max="1" className="tag" style={{ width: "100%", padding: "6px 8px", fontFamily: "var(--font-mono)" }} />
      </label>
      <label className="caption" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        Observed progress (0–100)
        <input name="observedProgress" type="number" step="1" min="0" max="100" className="tag" style={{ width: "100%", padding: "6px 8px", fontFamily: "var(--font-mono)" }} />
      </label>
      <label className="caption" style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "1 / -1" }}>
        Notes
        <textarea name="notes" rows={2} className="tag" style={{ width: "100%", padding: "6px 8px", fontFamily: "var(--font-mono)", resize: "vertical" }} />
      </label>
      <label className="caption" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        Recorded by
        <input name="recordedBy" type="text" className="tag" style={{ width: "100%", padding: "6px 8px", fontFamily: "var(--font-mono)" }} />
      </label>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-ghost" style={{ fontSize: "var(--t-12)", padding: "6px 12px" }} onClick={() => setOpen(false)}>Cancel</button>
        <button type="submit" className="btn btn-primary" style={{ fontSize: "var(--t-12)", padding: "6px 12px" }}>Save</button>
      </div>
    </form>
  );
}
