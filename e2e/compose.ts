import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const composeFile = path.join(repositoryRoot, "docker-compose.yaml");
const projectName = process.env.E2E_COMPOSE_PROJECT ?? "ai-interview-canvas-e2e";
const composeEnvironment = {
  ...process.env,
  APP_PORT: process.env.E2E_APP_PORT ?? "18000",
  POSTGRES_PORT: process.env.E2E_POSTGRES_PORT ?? "15432",
};

export function runCompose(...args: string[]) {
  const dockerComposePlugin = spawnSync("docker", ["compose", "version"], { stdio: "ignore" });
  const executable = dockerComposePlugin.status === 0 ? "docker" : "docker-compose";
  const prefix = dockerComposePlugin.status === 0 ? ["compose"] : [];
  execFileSync(
    executable,
    [...prefix, "--file", composeFile, "--project-name", projectName, ...args],
    { cwd: repositoryRoot, env: composeEnvironment, stdio: "inherit" },
  );
}
