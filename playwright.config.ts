import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
// Debe coincidir con `base` en astro.config.mjs.
const BASE_PATH = '/time-to-learn/';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}${BASE_PATH}`,
    trace: 'on-first-retry',
  },
  // Decisión transversal 5 de la Etapa 1: cada test corre en tema claro, tema oscuro y celular.
  projects: [
    {
      name: 'claro',
      use: { ...devices['Desktop Chrome'], colorScheme: 'light' },
    },
    {
      name: 'oscuro',
      use: { ...devices['Desktop Chrome'], colorScheme: 'dark' },
    },
    {
      name: 'celular',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 800 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        colorScheme: 'light',
      },
    },
  ],
  webServer: {
    command: `pnpm preview --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
