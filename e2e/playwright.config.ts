import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  workers: 1,
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  use: {
    baseURL:
      process.env.E2E_BASE_URL ?? `http://127.0.0.1:${process.env.E2E_APP_PORT ?? "18000"}`,
    browserName: "chromium",
    channel: "chrome",
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  }
});
