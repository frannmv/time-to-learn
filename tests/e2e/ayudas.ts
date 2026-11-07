import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

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

/** Verifica que la página no se desplace en horizontal. */
export async function sinScrollHorizontal(page: Page): Promise<void> {
  const { ancho, visible } = await page.evaluate(() => ({
    ancho: document.documentElement.scrollWidth,
    visible: document.documentElement.clientWidth,
  }));
  expect(ancho, 'el contenido es más ancho que la ventana').toBeLessThanOrEqual(visible);
}
