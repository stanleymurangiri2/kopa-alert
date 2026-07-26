import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT || "3000";
const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",

  /* Test timeout */
  timeout: 60 * 1000,

  expect: {
    timeout: 10 * 1000,
  },

  /* Run tests in parallel */
  fullyParallel: true,

  /* Prevent accidental test.only in CI */
  forbidOnly: !!process.env.CI,

  /* Retries */
  retries: process.env.CI ? 2 : 0,

  /* Workers */
  workers: process.env.CI ? 2 : undefined,

  /* Reports */
  reporter: [
    ["html", { open: "never" }],
    ["list"],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],

  /* Shared settings */
  use: {
    baseURL: BASE_URL,

    headless: true,

    ignoreHTTPSErrors: true,

    trace: "retain-on-failure",

    screenshot: "only-on-failure",

    video: "retain-on-failure",

    actionTimeout: 15 * 1000,

    navigationTimeout: 30 * 1000,

    viewport: {
      width: 1440,
      height: 900,
    },
  },

  /* Local development server */
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: BASE_URL,
        timeout: 120 * 1000,
        reuseExistingServer: true,
      },

  /* Browser projects */
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },

    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
      },
    },

    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
      },
    },

    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"],
      },
    },

    {
      name: "mobile-safari",
      use: {
        ...devices["iPhone 14"],
      },
    },
  ],

  /* Output folders */
  outputDir: "test-results/playwright",

  /* Global setup/teardown (optional) */
  // globalSetup: require.resolve("./tests/e2e/global-setup"),
  // globalTeardown: require.resolve("./tests/e2e/global-teardown"),
});