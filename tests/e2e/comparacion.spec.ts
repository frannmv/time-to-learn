/**
 * Tabla comparativa de modelos (pieza 2.5): OSI frente a TCP/IP y a IEEE 802, con la PDU de
 * cada capa. Los datos son los de src/engine/osi/modelos.ts.
 */
import { expect, test, type Locator } from '@playwright/test';
import { revisarAccesibilidad, sinScrollHorizontal } from './ayudas';

const SECCION = '[aria-labelledby="comparacion"]';
const COMPLETA = 'Comparación de los modelos OSI, TCP/IP e IEEE 802';
const REDUCIDA = 'Comparación de los modelos OSI y TCP/IP';

/** Borde de arriba y de abajo de un elemento, en píxeles de la página. */
async function bordes(elemento: Locator): Promise<{ arriba: number; abajo: number }> {
  const caja = await elemento.boundingBox();
  if (caja === null) throw new Error('El elemento no tiene caja');
  return { arriba: caja.y, abajo: caja.y + caja.height };
}

test.describe('comparación de modelos en /demo/', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('demo/');
  });

  test('la tabla tiene encabezados de columna y una fila por capa OSI', async ({ page }) => {
    const tabla = page.getByRole('region', { name: COMPLETA }).getByRole('table');
    await expect(tabla).toHaveAccessibleName(COMPLETA);
    await expect(tabla.getByRole('columnheader')).toHaveText([
      'Capa OSI',
      'PDU en OSI',
      'Capa TCP/IP',
      /^PDU en TCP\/IP/,
      'IEEE 802',
    ]);
    await expect(tabla.getByRole('rowheader')).toHaveText([
      '7 · Aplicación',
      '6 · Presentación',
      '5 · Sesión',
      '4 · Transporte',
      '3 · Red',
      '2 · Enlace de datos',
      '1 · Física',
    ]);
    // La capa 2 ocupa dos filas: una por subcapa de IEEE 802.
    await expect(tabla.locator('tbody tr')).toHaveCount(8);
  });

  test('la aplicación de TCP/IP cubre las capas OSI 5 a 7', async ({ page }) => {
    const tabla = page.getByRole('region', { name: COMPLETA });
    const aplicacion = tabla.locator('td[data-columna="tcpip"]', { hasText: 'Aplicación' });
    await expect(aplicacion).toHaveAttribute('rowspan', '3');
    await expect(aplicacion).toHaveAttribute('data-capas', '5 6 7');
    // Un lector de pantalla oye a qué capas corresponde aunque la lea fuera de su fila.
    await expect(aplicacion).toContainText('(capas OSI 5 a 7)');

    const celda = await bordes(aplicacion);
    const capa7 = await bordes(tabla.locator('tr[data-capa-fila="7"]'));
    const capa5 = await bordes(tabla.locator('tr[data-capa-fila="5"]'));
    expect(celda.arriba).toBeCloseTo(capa7.arriba, 0);
    expect(celda.abajo).toBeCloseTo(capa5.abajo, 0);
  });

  test('LLC y MAC quedan dentro de la capa 2', async ({ page }) => {
    const tabla = page.getByRole('region', { name: COMPLETA });
    const capa2 = tabla.getByRole('rowheader', { name: '2 · Enlace de datos' });
    await expect(capa2).toHaveAttribute('rowspan', '2');
    const limites = await bordes(capa2);

    const llc = tabla.locator('td[data-columna="ieee802"]', { hasText: 'LLC' });
    const mac = tabla.locator('td[data-columna="ieee802"]', { hasText: 'MAC' });
    await expect(llc).toContainText('Control de enlace lógico');
    await expect(mac).toContainText('Control de acceso al medio');
    for (const subcapa of [llc, mac]) {
      await expect(subcapa).toHaveAttribute('data-capas', '2');
      const caja = await bordes(subcapa);
      expect(caja.arriba).toBeGreaterThanOrEqual(limites.arriba - 0.5);
      expect(caja.abajo).toBeLessThanOrEqual(limites.abajo + 0.5);
    }
    // LLC es la subcapa de arriba.
    expect((await bordes(llc)).abajo).toBeLessThanOrEqual((await bordes(mac)).arriba + 0.5);

    const fuera = tabla.locator('td[data-columna="ieee802"]', { hasText: 'Fuera de su alcance' });
    await expect(fuera).toHaveAttribute('data-capas', '3 4 5 6 7');
  });

  test('sin la columna IEEE 802, la capa 2 ocupa una sola fila', async ({ page }) => {
    const tabla = page.getByRole('region', { name: REDUCIDA }).getByRole('table');
    await expect(tabla.getByRole('columnheader')).toHaveCount(3);
    await expect(tabla.locator('tbody tr')).toHaveCount(7);
    await expect(tabla.getByRole('rowheader', { name: '2 · Enlace de datos' })).not.toHaveAttribute(
      'rowspan',
    );
    const enlace = tabla.locator('td[data-columna="tcpip"]', { hasText: 'Enlace' });
    await expect(enlace).toHaveAttribute('rowspan', '2');
    await expect(enlace).toHaveAttribute('data-capas', '1 2');
  });

  test('no carga JavaScript', async ({ page }) => {
    const seccion = page.locator(SECCION);
    await expect(seccion.locator('astro-island, script')).toHaveCount(0);
  });

  test('el contenedor desplazable se enfoca y tiene nombre', async ({ page }) => {
    for (const nombre of [COMPLETA, REDUCIDA]) {
      const region = page.getByRole('region', { name: nombre });
      await region.focus();
      await expect(region).toBeFocused();
    }
  });

  test('es accesible y la página no se desplaza en horizontal', async ({ page }) => {
    await revisarAccesibilidad(page, SECCION);
    await sinScrollHorizontal(page);
  });
});

test('en celular la tabla se desplaza dentro de su contenedor, también con el teclado', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'celular', 'solo aplica al ancho de 360 px');
  await page.goto('demo/');
  await sinScrollHorizontal(page);
  const region = page.getByRole('region', { name: COMPLETA });
  const { ancho, visible } = await region.evaluate((el) => ({
    ancho: el.scrollWidth,
    visible: el.clientWidth,
  }));
  expect(ancho).toBeGreaterThan(visible);

  await region.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await sinScrollHorizontal(page);
});
