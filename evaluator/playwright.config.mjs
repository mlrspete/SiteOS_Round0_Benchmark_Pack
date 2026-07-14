import { defineConfig } from '@playwright/test'
import chromium from '@sparticuz/chromium'

const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || await chromium.executablePath()

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
      executablePath,
      args: chromium.args,
    },
  },
})
