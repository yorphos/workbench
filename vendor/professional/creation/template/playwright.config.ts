import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: "*.spec.ts",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4199", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "BASE_PATH=/pilot/ node scripts/fixture.ts",
    url: "http://127.0.0.1:4199/pilot/healthz",
    reuseExistingServer: false,
  },
});
