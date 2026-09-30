import { defineConfig, devices } from "@playwright/test";
const prefix = process.env.BASE_PATH || "/";
export default defineConfig({
  testDir: "tests/browser",
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:4196" + prefix,
    trace: "retain-on-failure",
    extraHTTPHeaders: {
      "X-Portfolio-Secret": "synthetic-browser-fixture-credential-".repeat(2),
      "X-Portfolio-User": "portfolio-codex-test",
      "X-Portfolio-Email": "yorphos@gmail.com",
      "X-Portfolio-Role": "member",
    },
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "node scripts/browser-fixture.ts",
    env: { PORT: "4196", BASE_PATH: prefix },
    url: "http://127.0.0.1:4196/healthz",
    reuseExistingServer: false,
  },
});
