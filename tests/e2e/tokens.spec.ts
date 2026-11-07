import { expect, test, type Page } from '@playwright/test';
import { sinScrollHorizontal } from './ayudas';

const CAPAS = [
  'Física',
  'Enlace de datos',
  'Red',
  'Transporte',
  'Sesión',
  'Presentación',
  'Aplicación',
];

const variable = (page: Page, nombre: string) =>
  page.evaluate(
    (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
    nombre,
  );

/** Lee una duración CSS («300ms», «0s») en milisegundos. El build puede reescribir la unidad. */
const milisegundos = async (page: Page, nombre: string) => {
  const valor = await variable(page, nombre);
  const [, numero, unidad] = /^([\d.]+)(ms|s)$/.exec(valor) ?? [];
  if (numero === undefined) throw new Error(`${nombre} no es una duración: «${valor}»`);
  return Number(numero) * (unidad === 's' ? 1000 : 1);
};

test.describe('página de demostración', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('demo/');
  });

  test('carga y pide no ser indexada', async ({ page }) => {
    await expect(page).toHaveTitle(/Demostración/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  });

  test('la sección Tokens muestra las 7 capas con número y nombre', async ({ page }) => {
    const seccion = page.getByRole('region', { name: 'Tokens' });
    await expect(seccion).toBeVisible();
    const capas = seccion
      .getByRole('list', { name: 'Colores de las capas OSI' })
      .getByRole('listitem');
    await expect(capas).toHaveCount(7);
    for (const [i, nombre] of CAPAS.entries()) {
      await expect(capas.nth(i)).toContainText(`Capa ${i + 1}`);
      await expect(capas.nth(i)).toContainText(nombre);
    }
  });

  test('no tiene scroll horizontal', async ({ page }) => {
    await sinScrollHorizontal(page);
  });

  test('cada tema usa sus propios colores', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    const claro = await variable(page, '--color-fondo');
    await page.emulateMedia({ colorScheme: 'dark' });
    const oscuro = await variable(page, '--color-fondo');
    expect(claro).not.toBe(oscuro);
  });

  test('con movimiento reducido las duraciones valen 0', async ({ page }) => {
    const duraciones = ['--duracion-rapida', '--duracion-media', '--duracion-lenta'];
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    for (const d of duraciones) expect(await milisegundos(page, d), d).toBeGreaterThan(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const d of duraciones) expect(await milisegundos(page, d), d).toBe(0);
  });
});

test.describe('inicio', () => {
  test('no tiene scroll horizontal', async ({ page }) => {
    await page.goto('./');
    await sinScrollHorizontal(page);
  });

  test('no enlaza a la página de demostración', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('a[href*="demo"]')).toHaveCount(0);
  });
});
