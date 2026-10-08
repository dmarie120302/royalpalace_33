import { defineConfig, devices } from "@playwright/test";

const realBackend = process.env.E2E_BACKEND === "real";
const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  timeout: 45_000,
  use: { baseURL, screenshot: "only-on-failure", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer:
    process.env.E2E_USE_EXISTING_SERVER === "1"
      ? undefined
      : {
          command: "npm run dev",
          url: baseURL,
          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            NEXT_PUBLIC_SUPABASE_URL: realBackend
              ? process.env.NEXT_PUBLIC_SUPABASE_URL || ""
              : "",
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: realBackend
              ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""
              : "",
            SUPABASE_SECRET_KEY: realBackend
              ? process.env.SUPABASE_SECRET_KEY || ""
              : "",
          },
        },
});
