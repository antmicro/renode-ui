import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  workers: 1,
  reporter: [
    ['list', { printSteps: true }],
    ['html', { printSteps: true, open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    testIdAttribute: 'data-test-id',
  },
  webServer: {
    command: 'npm run build:web && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'pipe',
    wait: {
      stdout: /localhost:4173/,
    },
  },
  retries: 1,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'chromium-old',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox-old',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
