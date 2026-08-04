// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // The Docker image only needs browser assets; other deployments retain Nitro.
  nitro: process.env.STATIC_BUILD === "true" ? false : undefined,
  vite: {
    server: {
      proxy: {
        "/api": {
          target: process.env.VITE_API_TARGET ?? "http://127.0.0.1:8000",
          changeOrigin: true,
        },
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // Emit an HTML shell that the Python backend can use as an SPA fallback.
    spa: {
      enabled: true,
      prerender: { outputPath: "/index.html" },
    },
  },
});
