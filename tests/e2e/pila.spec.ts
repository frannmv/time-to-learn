/**
 * Vista de pila de protocolos (pieza 2.3) con el escenario ficticio de
 * src/engine/demo/pila.ts: A (capas 1 a 4) — B (router, capas 1 a 3) — C (capas 1 a 4).
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { revisarAccesibilidad, sinScrollHorizontal } from './ayudas';

type VentanaConConteo = Window & { animacionesCreadas?: number };

/** Cuenta las llamadas a Element.animate. Hay que llamarla antes de `page.goto`. */
async function contarAnimaciones(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const ventana = window as VentanaConConteo;
    const original = Element.prototype.animate;
    ventana.animacionesCreadas = 0;
    Element.prototype.animate = function (this: Element, ...args) {
      ventana.animacionesCreadas = (ventana.animacionesCreadas ?? 0) + 1;
      return original.apply(this, args);
    };
  });
}

const animacionesCreadas = (page: Page) =>
  page.evaluate(() => (window as VentanaConConteo).animacionesCreadas ?? 0);

const animacionesEnCurso = (page: Page) => page.evaluate(() => document.getAnimations().length);

const SECCION = '[aria-labelledby="pila"]';

/** Lleva la simulación de la pila a la vista y espera a que su isla se hidrate. */
async function abrirPila(page: Page): Promise<Locator> {
  const simulacion = page.getByRole('region', { name: 'Simulación de la pila de protocolos' });
  await simulacion.scrollIntoViewIfNeeded();
  await expect(
    page.locator('astro-island[component-url*="Simulation"]').filter({ has: simulacion }),
  ).not.toHaveAttribute('ssr');
  return simulacion;
}

const partes = (simulacion: Locator) => ({
  anterior: simulacion.getByRole('button', { name: 'Anterior' }),
  siguiente: simulacion.getByRole('button', { name: 'Siguiente' }),
  reiniciar: simulacion.getByRole('button', { name: 'Reiniciar' }),
  contador: simulacion.getByText(/^Paso \d+ de \d+$/),
  diagrama: simulacion.getByRole('region', { name: 'Diagrama de la pila de protocolos' }),
  pila: simulacion.getByRole('img', { name: 'Pila de protocolos' }),
  marca: simulacion.locator('[data-marca="pdu"]'),
  capaActual: simulacion.locator('[data-capa][data-actual]'),
  pdu: simulacion.locator('[data-pdu-vista]'),
  partesPdu: simulacion.locator('[data-pdu-vista] li'),
});

async function avanzar(siguiente: Locator, veces: number): Promise<void> {
  for (let i = 0; i < veces; i++) await siguiente.click();
}

test.describe('demostración: pila de protocolos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('demo/');
  });

  test('dibuja una columna por equipo con sus capas, en texto', async ({ page }) => {
    const s = partes(await abrirPila(page));
    for (const [nodo, capas] of [
      ['a', 4],
      ['b', 3],
      ['c', 4],
    ] as const) {
      await expect(s.pila.locator(`[data-nodo="${nodo}"] [data-capa]`)).toHaveCount(capas);
    }
    const red = s.pila.locator('[data-nodo="b"] [data-capa="3"]');
    await expect(red).toContainText('Capa 3');
    await expect(red).toContainText('Red');
    await expect(s.pila).toHaveAccessibleDescription(
      /^Pila de cada equipo: A \(host\), capas 1 a 4; B \(router\), capas 1 a 3; C \(host\), capas 1 a 4\./,
    );
  });

  test('al avanzar cambia la capa marcada y la PDU suma o pierde partes', async ({ page }) => {
    const s = partes(await abrirPila(page));

    // Paso 1: A, capa 4. La marca dice «PDU» en texto, no solo con el borde.
    await expect(s.contador).toHaveText('Paso 1 de 15');
    await expect(s.marca).toHaveAttribute('data-en', 'a:4');
    await expect(s.marca).toContainText('PDU');
    await expect(s.capaActual).toHaveCount(1);
    await expect(s.pila.locator('[data-nodo="a"] [data-capa="4"]')).toHaveAttribute(
      'data-actual',
      'true',
    );
    await expect(s.pdu.locator('[data-pdu-nombre]')).toHaveText('Bloque de juguete');
    await expect(s.partesPdu).toHaveCount(2);
    await expect(s.pila).toHaveAccessibleDescription(
      /Bloque de juguete en la capa 4 \(Transporte\) de A\.$/,
    );

    // Paso 2: baja a la capa 3 y la PDU suma E3, con su nombre y su capa en texto.
    await s.siguiente.click();
    await expect(s.marca).toHaveAttribute('data-en', 'a:3');
    await expect(s.pila.locator('[data-nodo="a"] [data-capa="3"]')).toHaveAttribute(
      'data-actual',
      'true',
    );
    await expect(s.partesPdu).toHaveCount(3);
    const e3 = s.partesPdu.first();
    await expect(e3).toHaveAttribute('data-capa', '3');
    await expect(e3).toContainText('E3 (ficticio)');
    await expect(e3).toContainText('Capa 3 · Red');

    // Paso 3: la capa 2 suma un encabezado adelante y una cola al final.
    await s.siguiente.click();
    await expect(s.partesPdu).toHaveCount(5);
    await expect(s.partesPdu.last()).toHaveAttribute('data-parte', 'cola');
    await expect(s.partesPdu.last()).toContainText('Cola · capa 2 · Enlace de datos');
    await expect(s.pdu).toContainText('27 bytes en total');

    // Paso 5: los bits cruzan el medio, con una flecha hacia B.
    await avanzar(s.siguiente, 2);
    await expect(s.marca).toHaveAttribute('data-en', 'enlace:a-b');
    await expect(s.marca).toHaveText('Bits de juguete →');
    await expect(s.capaActual).toHaveCount(0);
    await expect(s.pila.locator('[data-enlace="a-b"]')).toHaveAttribute('data-activo', 'true');
    await expect(s.pila).toHaveAccessibleDescription(
      /Bits de juguete sobre el enlace de A hacia B\.$/,
    );

    // Paso 8: B sube a su capa 3 y la PDU pierde la trama.
    await avanzar(s.siguiente, 3);
    await expect(s.marca).toHaveAttribute('data-en', 'b:3');
    await expect(s.partesPdu).toHaveCount(3);
    await expect(s.pdu).not.toContainText('E2 (ficticio)');

    // Retroceder también cambia la capa marcada.
    await s.anterior.click();
    await expect(s.marca).toHaveAttribute('data-en', 'b:2');
    await expect(s.partesPdu).toHaveCount(5);
  });

  test('la PDU de la simulación no muestra desplazamientos', async ({ page }) => {
    const s = partes(await abrirPila(page));
    await expect(s.partesPdu.first()).toContainText('4 bytes');
    await expect(s.pdu).not.toContainText(/bytes? \d+ a \d+/);
  });

  test('es accesible y no desborda la página', async ({ page }) => {
    const s = partes(await abrirPila(page));
    await avanzar(s.siguiente, 4);
    await revisarAccesibilidad(page, SECCION);
    await sinScrollHorizontal(page);
  });
});

test.describe('demostración: PDU estática', () => {
  test('se dibuja en el HTML, fuera de toda isla', async ({ page }) => {
    await page.goto('demo/');
    const estatica = page.getByTestId('pdu-estatica');
    await expect(estatica.locator('xpath=ancestor::astro-island')).toHaveCount(0);
    await expect(estatica.locator('astro-island')).toHaveCount(0);
  });

  test.describe('sin JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('muestra cada parte con su capa, su tamaño y qué bytes ocupa', async ({ page }) => {
      await page.goto('demo/');
      const estatica = page.getByTestId('pdu-estatica');
      await expect(estatica.locator('[data-pdu-nombre]')).toHaveText('Trama de juguete');
      await expect(estatica).toContainText('27 bytes en total');
      const items = estatica.locator('li');
      await expect(items).toHaveCount(5);
      await expect(items.nth(0)).toContainText('Capa 2 · Enlace de datos');
      await expect(items.nth(0)).toContainText('6 bytes · bytes 0 a 5');
      await expect(items.nth(3)).toContainText('Datos');
      await expect(items.nth(4)).toContainText('Cola · capa 2 · Enlace de datos');
      await expect(items.nth(4)).toContainText('2 bytes · bytes 25 a 26');
      await sinScrollHorizontal(page);
    });
  });

  test('en celular es una lista vertical; con espacio, una fila', async ({ page }, testInfo) => {
    await page.goto('demo/');
    const items = page.getByTestId('pdu-estatica').locator('li');
    const [primera, segunda] = await Promise.all([
      items.nth(0).boundingBox(),
      items.nth(1).boundingBox(),
    ]);
    if (primera === null || segunda === null) throw new Error('las partes no se dibujaron');
    if (testInfo.project.name === 'celular') {
      expect(segunda.y).toBeGreaterThan(primera.y);
      expect(segunda.x).toBeCloseTo(primera.x, 0);
    } else {
      expect(segunda.x).toBeGreaterThan(primera.x);
      expect(segunda.y).toBeCloseTo(primera.y, 0);
    }
    await revisarAccesibilidad(page, '[data-testid="pdu-estatica"]');
  });
});

test.describe('demostración: movimiento en la pila', () => {
  test.beforeEach(async ({ page }) => {
    await contarAnimaciones(page);
    await page.goto('demo/');
  });

  test('la marca se desplaza solo al avanzar un paso', async ({ page }) => {
    const s = partes(await abrirPila(page));
    const antes = await animacionesCreadas(page);

    await s.siguiente.click();
    await expect(s.marca).toHaveAttribute('data-en', 'a:3');
    expect(await animacionesCreadas(page)).toBe(antes + 1);

    // Retroceder y reiniciar cambian de lugar sin desplazar.
    await s.anterior.click();
    await expect(s.marca).toHaveAttribute('data-en', 'a:4');
    expect(await animacionesCreadas(page)).toBe(antes + 1);
    await avanzar(s.siguiente, 2);
    await expect(s.marca).toHaveAttribute('data-en', 'a:2');
    expect(await animacionesCreadas(page)).toBe(antes + 3);
    await s.reiniciar.click();
    await expect(s.marca).toHaveAttribute('data-en', 'a:4');
    expect(await animacionesCreadas(page)).toBe(antes + 3);
    expect(await animacionesEnCurso(page)).toBe(0);
  });

  test.describe('con movimiento reducido', () => {
    test.use({ reducedMotion: 'reduce' });

    test('no quedan animaciones en curso al avanzar', async ({ page }) => {
      const s = partes(await abrirPila(page));
      for (const destino of ['a:3', 'a:2', 'a:1', 'enlace:a-b']) {
        await s.siguiente.click();
        await expect(s.marca).toHaveAttribute('data-en', destino);
        expect(await animacionesEnCurso(page)).toBe(0);
      }
      expect(await animacionesCreadas(page)).toBe(0);
    });
  });
});

test('en celular el diagrama de la pila se desplaza dentro de su contenedor', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'celular', 'solo aplica al ancho de 360 px');
  await page.goto('demo/');
  const s = partes(await abrirPila(page));
  await sinScrollHorizontal(page);
  const { ancho, visible } = await s.diagrama.evaluate((el) => ({
    ancho: el.scrollWidth,
    visible: el.clientWidth,
  }));
  expect(ancho).toBeGreaterThan(visible);
});
