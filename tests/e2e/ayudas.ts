import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';

/** Reglas de axe que se exigen: WCAG 2.0, 2.1 y 2.2, niveles A y AA. */
const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Corre axe sobre la página actual y falla si encuentra violaciones de WCAG A o AA.
 * `incluir` limita el análisis a un selector (por ejemplo, una sección de /demo/).
 */
export async function revisarAccesibilidad(page: Page, incluir?: string): Promise<void> {
  let analisis = new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG);
  if (incluir) analisis = analisis.include(incluir);
  const { violations } = await analisis.analyze();
  const resumen = violations.map((v) => ({
    regla: v.id,
    impacto: v.impact,
    descripcion: v.help,
    nodos: v.nodes.map((n) => n.target.join(' ')),
  }));
  expect(resumen).toEqual([]);
}

/**
 * Lleva cada isla de la página a la vista y espera a que se hidrate: con `client:visible`,
 * Astro le quita el atributo `ssr` a `astro-island` al terminar. Vuelve arriba al final.
 */
export async function hidratarTodas(page: Page): Promise<Locator> {
  const islas = page.locator('astro-island');
  for (const isla of await islas.all()) {
    await isla.scrollIntoViewIfNeeded();
    await expect(isla).not.toHaveAttribute('ssr');
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  return islas;
}

/** Verifica que la página no se desplace en horizontal. */
export async function sinScrollHorizontal(page: Page): Promise<void> {
  const { ancho, visible } = await page.evaluate(() => ({
    ancho: document.documentElement.scrollWidth,
    visible: document.documentElement.clientWidth,
  }));
  expect(ancho, 'el contenido es más ancho que la ventana').toBeLessThanOrEqual(visible);
}
