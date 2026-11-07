import { test } from '@playwright/test';
import { revisarAccesibilidad } from './ayudas';

/**
 * Chequeo automático de accesibilidad (axe, WCAG A y AA) en cada página del sitio.
 * Cada pieza que agrega una página la suma a esta lista.
 */
const PAGINAS = [
  { nombre: 'inicio', ruta: './' },
  { nombre: 'demostración', ruta: 'demo/' },
];

for (const { nombre, ruta } of PAGINAS) {
  test(`${nombre}: sin violaciones de WCAG A y AA`, async ({ page }) => {
    await page.goto(ruta);
    await revisarAccesibilidad(page);
  });
}
