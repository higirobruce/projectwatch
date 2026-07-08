import express from "express";
import { InMemoryProjectRepository, type ProjectRepository } from "./repository/memory.js";
import { PostgresProjectRepository } from "./repository/postgres.js";
import { createProjectRouter } from "./routes/projects.js";

const PORT = Number(process.env.PORT ?? 4000);
const DATABASE_URL = process.env.DATABASE_URL;

let repo: ProjectRepository & { init?: () => Promise<void>; close?: () => Promise<void> };

async function main(): Promise<void> {
  if (DATABASE_URL) {
    const pg = new PostgresProjectRepository(DATABASE_URL);
    await pg.init();
    repo = pg;
    console.log("ProjectWatch API using PostGIS repository");
  } else {
    repo = new InMemoryProjectRepository();
    console.log("ProjectWatch API using in-memory repository (set DATABASE_URL for PostGIS)");
  }

  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "projectwatch-api", storage: DATABASE_URL ? "postgis" : "memory" });
  });

  app.use("/api/projects", createProjectRouter(repo));

  app.listen(PORT, () => {
    console.log(`ProjectWatch API listening on http://localhost:${PORT}`);
  });

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, async () => {
      await repo.close?.();
      process.exit(0);
    });
  }
}

main().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
