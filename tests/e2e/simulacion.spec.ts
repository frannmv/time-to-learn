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

/** Debe coincidir con INTERVALO_REPRODUCCION_MS de Simulation.tsx. */
const INTERVALO_MS = 2000;

/** Explicaciones del escenario ficticio de src/engine/demo/escenario.ts. */
const EXPLICACION = {
  0: /A prepara un mensaje para C/,
  1: /El mensaje viaja por el enlace de A hacia B/,
  2: /B recibe el mensaje y anota/,
  4: /C recibe el mensaje/,
} as const;

/**
 * Lleva la simulación de /demo/ a la vista y espera a que la isla se hidrate: con
 * `client:visible`, Astro quita el atributo `ssr` de `astro-island` al terminar.
 */
async function abrirSimulacion(page: Page): Promise<Locator> {
  const simulacion = page.getByRole('region', { name: 'Simulación de demostración' });
  await simulacion.scrollIntoViewIfNeeded();
  await expect(page.locator('astro-island[component-url*="Simulation"]')).not.toHaveAttribute(
    'ssr',
  );
  return simulacion;
}

const partes = (simulacion: Locator) => ({
  anterior: simulacion.getByRole('button', { name: 'Anterior' }),
  siguiente: simulacion.getByRole('button', { name: 'Siguiente' }),
  reiniciar: simulacion.getByRole('button', { name: 'Reiniciar' }),
  reproducir: simulacion.getByRole('button', { name: /^(Reproducir|Pausar)$/ }),
  contador: simulacion.getByText(/^Paso \d+ de \d+$/),
  explicacion: simulacion.locator('[aria-live="polite"]'),
  tabla: simulacion.getByRole('table', { name: 'Registro de B' }),
  diagrama: simulacion.getByRole('region', { name: 'Diagrama de la topología' }),
  topologia: simulacion.getByRole('img', { name: 'Topología' }),
  paquete: simulacion.locator('[data-paquete="mensaje"]'),
});

test.describe('demostración: simulación', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('demo/');
  });

  test('los botones avanzan, retroceden y reinician', async ({ page }) => {
    const s = partes(await abrirSimulacion(page));

    await expect(s.contador).toHaveText('Paso 1 de 5');
    await expect(s.anterior).toBeDisabled();
    await expect(s.explicacion).toHaveText(EXPLICACION[0]);

    await s.siguiente.click();
    await expect(s.contador).toHaveText('Paso 2 de 5');
    await expect(s.explicacion).toHaveText(EXPLICACION[1]);
    await expect(s.anterior).toBeEnabled();

    await s.anterior.click();
    await expect(s.contador).toHaveText('Paso 1 de 5');

    for (let i = 0; i < 4; i++) await s.siguiente.click();
    await expect(s.contador).toHaveText('Paso 5 de 5');
    await expect(s.siguiente).toBeDisabled();
    await expect(s.explicacion).toHaveText(EXPLICACION[4]);

    await s.reiniciar.click();
    await expect(s.contador).toHaveText('Paso 1 de 5');
  });

  test('el botón deshabilitado conserva el foco en el último paso', async ({ page }) => {
    const s = partes(await abrirSimulacion(page));
    await s.siguiente.focus();
    for (let i = 0; i < 6; i++) await page.keyboard.press('Enter');
    await expect(s.contador).toHaveText('Paso 5 de 5');
    await expect(s.siguiente).toBeFocused();
  });

  test('← y → cambian de paso con el foco en la simulación', async ({ page }) => {
    const simulacion = await abrirSimulacion(page);
    const s = partes(simulacion);

    await simulacion.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(s.contador).toHaveText('Paso 3 de 5');
    await expect(s.explicacion).toHaveText(EXPLICACION[2]);

    await page.keyboard.press('ArrowLeft');
    await expect(s.contador).toHaveText('Paso 2 de 5');

    // También funcionan con el foco en un botón.
    await s.reiniciar.focus();
    await page.keyboard.press('ArrowRight');
    await expect(s.contador).toHaveText('Paso 3 de 5');
  });

  test('las teclas no actúan con el foco fuera de la simulación', async ({ page }) => {
    const s = partes(await abrirSimulacion(page));
    await page.getByRole('heading', { name: 'Simulación', exact: true }).click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press(' ');
    await expect(s.contador).toHaveText('Paso 1 de 5');
    await expect(s.reproducir).toHaveText('Reproducir');
  });

  test('espacio reproduce y pausa', async ({ page }) => {
    await page.clock.install();
    await page.goto('demo/');
    const simulacion = await abrirSimulacion(page);
    const s = partes(simulacion);

    await simulacion.focus();
    await page.keyboard.press(' ');
    await expect(s.reproducir).toHaveText('Pausar');

    await page.clock.runFor(INTERVALO_MS);
    await expect(s.contador).toHaveText('Paso 2 de 5');
    await page.clock.runFor(INTERVALO_MS);
    await expect(s.contador).toHaveText('Paso 3 de 5');

    await page.keyboard.press(' ');
    await expect(s.reproducir).toHaveText('Reproducir');
    await page.clock.runFor(INTERVALO_MS * 3);
    await expect(s.contador).toHaveText('Paso 3 de 5');
  });

  test('la reproducción se detiene sola en el último paso', async ({ page }) => {
    await page.clock.install();
    await page.goto('demo/');
    const s = partes(await abrirSimulacion(page));

    await s.reproducir.click();
    // Un intervalo por vez: cada paso programa su temporizador después de dibujarse.
    for (let paso = 2; paso <= 5; paso++) {
      await page.clock.runFor(INTERVALO_MS);
      await expect(s.contador).toHaveText(`Paso ${paso} de 5`);
    }
    await expect(s.reproducir).toHaveText('Reproducir');
    await page.clock.runFor(INTERVALO_MS * 3);
    await expect(s.contador).toHaveText('Paso 5 de 5');

    // Reproducir desde el final vuelve a empezar.
    await s.reproducir.click();
    await expect(s.contador).toHaveText('Paso 1 de 5');
    await expect(s.reproducir).toHaveText('Pausar');
  });

  test('la tabla marca la fila nueva con texto y después la deja sin marca', async ({ page }) => {
    const s = partes(await abrirSimulacion(page));

    await expect(s.tabla).toContainText('Sin entradas todavía');

    await s.siguiente.click();
    await s.siguiente.click();
    const fila = s.tabla.getByRole('row').filter({ hasText: 'Hola, C' });
    await expect(fila).toHaveAttribute('data-marca', 'nueva');
    await expect(fila.getByRole('cell').first()).toContainText('nueva');

    await s.siguiente.click();
    await expect(fila).not.toHaveAttribute('data-marca');
    await expect(fila).not.toContainText('nueva');
  });

  test('al avanzar, el paquete cambia de nodo o de enlace', async ({ page }) => {
    const s = partes(await abrirSimulacion(page));

    await expect(s.paquete).toHaveAttribute('data-ubicacion', 'nodo:a');
    await s.siguiente.click();
    await expect(s.paquete).toHaveAttribute('data-ubicacion', 'enlace:a-b');
    await s.siguiente.click();
    await expect(s.paquete).toHaveAttribute('data-ubicacion', 'nodo:b');
    await s.anterior.click();
    await expect(s.paquete).toHaveAttribute('data-ubicacion', 'enlace:a-b');
  });

  test('el paquete muestra el nombre de su encabezado y de su capa', async ({ page }) => {
    const s = partes(await abrirSimulacion(page));
    const encabezado = s.paquete.locator('[data-capa="7"]');
    await expect(encabezado).toContainText('Mensaje de juguete (ficticio)');
    await expect(encabezado).toContainText('Capa 7 · Aplicación');
  });

  test('lo resaltado del paso se marca en el diagrama', async ({ page }) => {
    const s = partes(await abrirSimulacion(page));
    const nodoA = s.topologia.locator('[data-nodo="a"]');
    const enlaceAB = s.topologia.locator('[data-enlace="a-b"]');

    await expect(nodoA).toHaveAttribute('data-resaltado', 'true');
    await expect(enlaceAB).not.toHaveAttribute('data-resaltado');

    await s.siguiente.click();
    await expect(nodoA).not.toHaveAttribute('data-resaltado');
    await expect(enlaceAB).toHaveAttribute('data-resaltado', 'true');
  });

  test('la descripción del diagrama dice la topología y dónde está el paquete', async ({
    page,
  }) => {
    const s = partes(await abrirSimulacion(page));
    await expect(s.topologia).toHaveAccessibleDescription(
      /3 nodos: A \(host\), B \(router\) y C \(host\)\..*: en A\.$/,
    );
    await s.siguiente.click();
    await expect(s.topologia).toHaveAccessibleDescription(/sobre el enlace de A hacia B\.$/);
  });

  test('las flechas no cambian de paso con el foco en el diagrama', async ({ page }) => {
    const s = partes(await abrirSimulacion(page));
    await s.diagrama.focus();
    await page.keyboard.press('ArrowRight');
    await expect(s.contador).toHaveText('Paso 1 de 5');
  });

  test('es accesible y no desborda la página', async ({ page }) => {
    const s = partes(await abrirSimulacion(page));
    await s.siguiente.click();
    await s.siguiente.click();
    await revisarAccesibilidad(page, '[aria-labelledby="simulacion"]');
    await sinScrollHorizontal(page);
  });
});

test.describe('demostración: movimiento del paquete', () => {
  test.beforeEach(async ({ page }) => {
    await contarAnimaciones(page);
    await page.goto('demo/');
  });

  test('se desplaza solo al avanzar un paso', async ({ page }) => {
    const s = partes(await abrirSimulacion(page));

    await s.siguiente.click();
    await expect(s.paquete).toHaveAttribute('data-ubicacion', 'enlace:a-b');
    expect(await animacionesCreadas(page)).toBe(1);

    // Retroceder y reiniciar cambian de lugar sin desplazar.
    await s.anterior.click();
    await expect(s.paquete).toHaveAttribute('data-ubicacion', 'nodo:a');
    await s.siguiente.click();
    await s.siguiente.click();
    expect(await animacionesCreadas(page)).toBe(3);
    await s.reiniciar.click();
    await expect(s.paquete).toHaveAttribute('data-ubicacion', 'nodo:a');
    expect(await animacionesCreadas(page)).toBe(3);
    expect(await animacionesEnCurso(page)).toBe(0);
  });

  test.describe('con movimiento reducido', () => {
    test.use({ reducedMotion: 'reduce' });

    test('no hay animaciones después de avanzar', async ({ page }) => {
      const s = partes(await abrirSimulacion(page));

      await s.siguiente.click();
      await expect(s.paquete).toHaveAttribute('data-ubicacion', 'enlace:a-b');
      expect(await animacionesEnCurso(page)).toBe(0);
      await s.siguiente.click();
      await expect(s.paquete).toHaveAttribute('data-ubicacion', 'nodo:b');
      expect(await animacionesEnCurso(page)).toBe(0);
      expect(await animacionesCreadas(page)).toBe(0);
    });
  });
});

test('en celular el diagrama se desplaza dentro de su contenedor, no la página', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'celular', 'solo aplica al ancho de 360 px');
  await page.goto('demo/');
  const s = partes(await abrirSimulacion(page));

  await sinScrollHorizontal(page);
  const { ancho, visible } = await s.diagrama.evaluate((el) => ({
    ancho: el.scrollWidth,
    visible: el.clientWidth,
  }));
  expect(ancho).toBeGreaterThan(visible);
});

test('el inicio no tiene simulaciones y no carga React', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (pedido) => {
    if (pedido.resourceType() === 'script') scripts.push(pedido.url());
  });
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('astro-island')).toHaveCount(0);
  expect(scripts).toEqual([]);
});
