import { expect, test } from '@playwright/test';
import { revisarAccesibilidad, sinScrollHorizontal } from './ayudas';

test.describe('demostración: colección de módulos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('demo/');
  });

  test('muestra el módulo de ejemplo con sus metadatos validados', async ({ page }) => {
    const seccion = page.getByRole('region', { name: 'Colección de módulos' });
    const modulos = seccion
      .getByRole('list', { name: 'Módulos de la colección' })
      .getByRole('listitem');
    const ejemplo = modulos.filter({ hasText: 'Módulo de ejemplo' });
    await expect(ejemplo).toHaveCount(1);
    await expect(ejemplo).toContainText('(oculto)');
    await expect(ejemplo).toContainText('Fundamentos');
    await expect(ejemplo).toContainText('3 · Red');
    await expect(ejemplo).toContainText('RFC 1071');
  });

  test('el módulo de ejemplo no cuenta como visible', async ({ page }) => {
    const visibles = Number(await page.getByTestId('modulos-visibles').textContent());
    const total = await page
      .getByRole('list', { name: 'Módulos de la colección' })
      .getByRole('listitem')
      .count();
    expect(visibles).toBe(total - 1);
  });

  test('la sección es accesible y no desborda', async ({ page }) => {
    await revisarAccesibilidad(page, '[aria-labelledby="coleccion"]');
    await sinScrollHorizontal(page);
  });
});
