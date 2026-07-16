import { defineConfig, devices } from '@playwright/test';

// E2E + accessibility smoke tests. Boots the Vite dev server automatically on
// a dedicated port (the regular dev server lives on 5175 — see vite.config.ts)
// with the API base URL blanked so the app runs on its built-in mocks, which
// is what the specs are written against.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5199',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev -- --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { VITE_API_BASE_URL: '' },
  },
});
