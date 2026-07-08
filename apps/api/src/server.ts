import express from "express";
import { InMemoryProjectRepository } from "./repository/memory.js";
import { createProjectRouter } from "./routes/projects.js";

const PORT = Number(process.env.PORT ?? 4000);
const repo = new InMemoryProjectRepository();

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "projectwatch-api" });
});

app.use("/api/projects", createProjectRouter(repo));

app.listen(PORT, () => {
  console.log(`ProjectWatch API listening on http://localhost:${PORT}`);
});
