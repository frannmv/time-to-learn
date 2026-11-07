import { expect, test } from '@playwright/test';

test('la página de inicio carga con el título del sitio', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle(/TimeToLearn/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('TimeToLearn · TTL');
});

test('la página está en español', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
});
