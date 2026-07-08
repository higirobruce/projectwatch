import express from "express";
import { Pool } from "pg";
import { InMemoryStore } from "./repository/memory.js";
import { PostgresStore } from "./repository/postgres.js";
import { createProjectRouter } from "./routes/projects.js";
import { createWorkerRouter } from "./routes/ingestions.js";

const PORT = Number(process.env.PORT ?? 4000);
const DATABASE_URL = process.env.DATABASE_URL;

type Store = InMemoryStore | PostgresStore;

async function main(): Promise<void> {
  let store: Store;
  if (DATABASE_URL) {
    const pool = new Pool({ connectionString: DATABASE_URL, max: 5 });
    store = new PostgresStore(pool);
    await store.init();
    console.log("ProjectWatch API using PostGIS repository");
  } else {
    store = new InMemoryStore();
    await store.init();
    console.log("ProjectWatch API using in-memory repository (set DATABASE_URL for PostGIS)");
  }

  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "projectwatch-api", storage: DATABASE_URL ? "postgis" : "memory" });
  });

  app.use("/api/projects", createProjectRouter(store));
  app.use("/api/ingestions", createWorkerRouter(store));

  app.listen(PORT, () => {
    console.log(`ProjectWatch API listening on http://localhost:${PORT}`);
  });

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, async () => {
      await store.close();
      process.exit(0);
    });
  }
}

main().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
