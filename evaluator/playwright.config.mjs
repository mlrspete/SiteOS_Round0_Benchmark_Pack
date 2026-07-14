import { defineConfig } from '@playwright/test'

if (!process.env.PLAYWRIGHT_EXECUTABLE_PATH) {
  throw new Error('Run the evaluator through scripts/evaluate-run.mjs so its pinned Chromium runtime is prepared.')
}
const chromiumArgs = JSON.parse(process.env.SITEOS_CHROMIUM_ARGS || '[]')

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['json']],
  use: {
    baseURL: process.env.SITEOS_BASE_URL || 'http://127.0.0.1:4173',
    headless: true,
    actionTimeout: 7_000,
    navigationTimeout: 15_000,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
      args: chromiumArgs,
    },
  },
})
