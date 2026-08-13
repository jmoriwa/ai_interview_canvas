import type { FullConfig } from "@playwright/test";
import { runCompose } from "./compose";

export default function globalSetup(_config: FullConfig) {
  if (process.env.E2E_SKIP_COMPOSE === "1") return;
  runCompose("up", "--build", "--detach", "--wait");
}

