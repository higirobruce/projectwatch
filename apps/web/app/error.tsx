"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="page">
      <p className="eyebrow">Error</p>
      <h1 className="display-1" style={{ fontSize: 48 }}>Something went wrong</h1>
      <p className="lead">{error.message || "An unexpected error occurred."}</p>
      <div className="row">
        <button className="btn" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
