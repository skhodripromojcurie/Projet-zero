import { defineConfig } from "@playwright/test";
import viteConfig from "./vite.config.js";

const studioUrl = `http://127.0.0.1:5173${viteConfig.base}`;
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: studioUrl,
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      ...(process.env.CHROMIUM_PATH
        ? { executablePath: process.env.CHROMIUM_PATH }
        : {}),
      args: [
        "--no-sandbox",
        "--enable-unsafe-swiftshader",
        "--use-angle=swiftshader",
      ],
    },
  },
  webServer: {
    command:
      process.env.STUDIO_PREVIEW === "1"
        ? "npm run preview -- --port 5173 --strictPort"
        : "npm run dev -- --port 5173 --strictPort",
    url: studioUrl,
    reuseExistingServer: !process.env.CI,
  },
});
