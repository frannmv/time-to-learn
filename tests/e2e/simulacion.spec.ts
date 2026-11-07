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
  5: /C lee el mensaje en su capa 7.*Fin del escenario/,
} as const;

/**
 * Lleva la simulación de /demo/ a la vista y espera a que la isla se hidrate: con
 * `client:visible`, Astro quita el atributo `ssr` de `astro-island` al terminar.
 */
async function abrirSimulacion(page: Page): Promise<Locator> {
  const simulacion = page.getByRole('region', { name: 'Simulación de demostración' });
  await simulacion.scrollIntoViewIfNeeded();
  // /demo/ tiene más de una simulación: se espera la isla que contiene a esta.
  await expect(
    page.locator('astro-island[component-url*="Simulation"]').filter({ has: simulacion }),
  ).not.toHaveAttribute('ssr');
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

    await expect(s.contador).toHaveText('Paso 1 de 6');
    await expect(s.anterior).toBeDisabled();
    await expect(s.explicacion).toHaveText(EXPLICACION[0]);

    await s.siguiente.click();
    await expect(s.contador).toHaveText('Paso 2 de 6');
    await expect(s.explicacion).toHaveText(EXPLICACION[1]);
    await expect(s.anterior).toBeEnabled();

    await s.anterior.click();
    await expect(s.contador).toHaveText('Paso 1 de 6');

    for (let i = 0; i < 5; i++) await s.siguiente.click();
    await expect(s.contador).toHaveText('Paso 6 de 6');
    await expect(s.siguiente).toBeDisabled();
    await expect(s.explicacion).toHaveText(EXPLICACION[5]);

    await s.reiniciar.click();
    await expect(s.contador).toHaveText('Paso 1 de 6');
  });

  test('el botón deshabilitado conserva el foco en el último paso', async ({ page }) => {
    const s = partes(await abrirSimulacion(page));
    await s.siguiente.focus();
    for (let i = 0; i < 7; i++) await page.keyboard.press('Enter');
    await expect(s.contador).toHaveText('Paso 6 de 6');
    await expect(s.siguiente).toBeFocused();
  });

  test('← y → cambian de paso con el foco en la simulación', async ({ page }) => {
    const simulacion = await abrirSimulacion(page);
    const s = partes(simulacion);

    await simulacion.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(s.contador).toHaveText('Paso 3 de 6');
    await expect(s.explicacion).toHaveText(EXPLICACION[2]);

    await page.keyboard.press('ArrowLeft');
    await expect(s.contador).toHaveText('Paso 2 de 6');

    // También funcionan con el foco en un botón.
    await s.reiniciar.focus();
    await page.keyboard.press('ArrowRight');
    await expect(s.contador).toHaveText('Paso 3 de 6');
  });

  test('las teclas no actúan con el foco fuera de la simulación', async ({ page }) => {
    const s = partes(await abrirSimulacion(page));
    await page.getByRole('heading', { name: 'Simulación', exact: true }).click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press(' ');
    await expect(s.contador).toHaveText('Paso 1 de 6');
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
    await expect(s.contador).toHaveText('Paso 2 de 6');
    await page.clock.runFor(INTERVALO_MS);
    await expect(s.contador).toHaveText('Paso 3 de 6');

    await page.keyboard.press(' ');
    await expect(s.reproducir).toHaveText('Reproducir');
    await page.clock.runFor(INTERVALO_MS * 3);
    await expect(s.contador).toHaveText('Paso 3 de 6');
  });

  test('la reproducción se detiene sola en el último paso', async ({ page }) => {
    await page.clock.install();
    await page.goto('demo/');
    const s = partes(await abrirSimulacion(page));

    await s.reproducir.click();
    // Un intervalo por vez: cada paso programa su temporizador después de dibujarse.
    for (let paso = 2; paso <= 6; paso++) {
      await page.clock.runFor(INTERVALO_MS);
      await expect(s.contador).toHaveText(`Paso ${paso} de 6`);
    }
    await expect(s.reproducir).toHaveText('Reproducir');
    await page.clock.runFor(INTERVALO_MS * 3);
    await expect(s.contador).toHaveText('Paso 6 de 6');

    // Reproducir desde el final vuelve a empezar.
    await s.reproducir.click();
    await expect(s.contador).toHaveText('Paso 1 de 6');
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

  test('en el último paso, la cola y la PDU se leen en texto, no solo por el estilo', async ({
    page,
  }) => {
    const s = partes(await abrirSimulacion(page));
    const cola = s.paquete.locator('[data-parte="cola"]');
    await expect(cola).toHaveCount(0);

    for (let i = 0; i < 5; i++) await s.siguiente.click();
    await expect(s.contador).toHaveText('Paso 6 de 6');

    await expect(cola).toHaveCount(1);
    await expect(cola).toHaveAttribute('data-capa', '7');
    await expect(cola).toContainText('Cierre de juguete (ficticio)');
    await expect(cola).toContainText('Cola · capa 7 · Aplicación');
    await expect(s.paquete.locator('[data-pdu]')).toHaveText('Mensaje de juguete');

    // La cola va debajo del encabezado de su capa.
    const encabezado = s.paquete.locator('[data-parte="encabezado"]');
    const yEncabezado = (await encabezado.boundingBox())?.y ?? Number.NaN;
    const yCola = (await cola.boundingBox())?.y ?? Number.NaN;
    expect(yCola).toBeGreaterThan(yEncabezado);

    await expect(s.topologia).toHaveAccessibleDescription(
      /Mensaje de juguete con .* y Cierre de juguete \(ficticio\) \(cola de la capa 7, Aplicación\): en la capa 7 de C\.$/,
    );
    // Una ubicación con capa se sigue dibujando en su nodo.
    await expect(s.paquete).toHaveAttribute('data-ubicacion', 'nodo:c');

    await revisarAccesibilidad(page, '[aria-labelledby="simulacion"]');
    await sinScrollHorizontal(page);
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
    await expect(s.contador).toHaveText('Paso 1 de 6');
  });

  test('es accesible y no desborda la página', async ({ page }) => {
    const s = partes(await abrirSimulacion(page));
    await s.siguiente.click();
    await s.siguiente.click();
    await revisarAccesibilidad(page, '[aria-labelledby="simulacion"]');
    await sinScrollHorizontal(page);
  });
});

/** Explicaciones de la variante ficticia «B descarta el mensaje» (simularDescarteDemo). */
const EXPLICACION_DESCARTE = {
  0: /Esta variante también es ficticia/,
  1: /El mensaje viaja por el enlace de A hacia B/,
  3: /B descarta el mensaje.*Fin de la variante ficticia/,
} as const;

const selector = (simulacion: Locator) => ({
  grupo: simulacion.getByRole('group', { name: 'Escenario' }),
  entrega: simulacion.getByRole('radio', { name: 'Entrega a C' }),
  descarte: simulacion.getByRole('radio', { name: 'B descarta el mensaje' }),
  actual: simulacion.getByTestId('escenario-actual'),
});

test.describe('demostración: escenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('demo/');
  });

  test('el selector va arriba de los controles y dice en texto qué escenario se ve', async ({
    page,
  }) => {
    const simulacion = await abrirSimulacion(page);
    const e = selector(simulacion);
    const s = partes(simulacion);

    await expect(e.grupo).toBeVisible();
    await expect(e.entrega).toBeChecked();
    await expect(e.actual).toHaveText('Mostrando: Entrega a C');
    const cajaSelector = await e.grupo.boundingBox();
    const cajaControles = await simulacion
      .getByRole('group', { name: 'Controles de la simulación' })
      .boundingBox();
    expect(cajaSelector?.y).toBeLessThan(cajaControles?.y ?? 0);
    // Al cargar no se anuncia ningún escenario: solo la explicación del paso.
    await expect(s.explicacion).toHaveText(EXPLICACION[0]);
    await expect(s.explicacion).not.toContainText('Escenario «');
  });

  test('cambiar de escenario vuelve al paso 1 y cambia la explicación', async ({ page }) => {
    const simulacion = await abrirSimulacion(page);
    const e = selector(simulacion);
    const s = partes(simulacion);

    await s.siguiente.click();
    await s.siguiente.click();
    await expect(s.contador).toHaveText('Paso 3 de 6');

    await e.descarte.check();
    await expect(s.contador).toHaveText('Paso 1 de 4');
    await expect(s.explicacion).toContainText(EXPLICACION_DESCARTE[0]);
    await expect(e.actual).toHaveText('Mostrando: B descarta el mensaje');

    // La navegación respeta el nuevo total, y en el último paso ya no hay paquete.
    for (let i = 0; i < 3; i++) await s.siguiente.click();
    await expect(s.contador).toHaveText('Paso 4 de 4');
    await expect(s.siguiente).toBeDisabled();
    await expect(s.explicacion).toHaveText(EXPLICACION_DESCARTE[3]);
    await expect(s.paquete).toHaveCount(0);

    await e.entrega.check();
    await expect(s.contador).toHaveText('Paso 1 de 6');
    await expect(s.explicacion).toContainText(EXPLICACION[0]);
  });

  test('el cambio se anuncia en la región de la explicación hasta cambiar de paso', async ({
    page,
  }) => {
    const simulacion = await abrirSimulacion(page);
    const e = selector(simulacion);
    const s = partes(simulacion);

    await e.descarte.check();
    await expect(s.explicacion).toHaveAttribute('aria-live', 'polite');
    await expect(s.explicacion).toContainText('Escenario «B descarta el mensaje», paso 1 de 4.');

    await s.siguiente.click();
    await expect(s.explicacion).toHaveText(EXPLICACION_DESCARTE[1]);
    await expect(s.explicacion).not.toContainText('Escenario «');

    // Al volver al paso 1 con los controles no se repite el anuncio del escenario.
    await s.anterior.click();
    await expect(s.explicacion).not.toContainText('Escenario «');
  });

  test('cambiar de escenario durante la reproducción la pausa', async ({ page }) => {
    const simulacion = await abrirSimulacion(page);
    const e = selector(simulacion);
    const s = partes(simulacion);

    await s.reproducir.click();
    await expect(s.reproducir).toHaveText('Pausar');
    await e.descarte.check();
    await expect(s.reproducir).toHaveText('Reproducir');
    await page.waitForTimeout(INTERVALO_MS + 500);
    await expect(s.contador).toHaveText('Paso 1 de 4');
  });

  test('dentro del selector, las flechas y espacio no cambian de paso', async ({ page }) => {
    const simulacion = await abrirSimulacion(page);
    const e = selector(simulacion);
    const s = partes(simulacion);

    await s.siguiente.click();
    await s.siguiente.click();
    await e.entrega.focus();
    await page.keyboard.press('ArrowRight');
    // La flecha hizo lo nativo (marcar el otro radio) y no avanzó un paso.
    await expect(e.descarte).toBeChecked();
    await expect(e.descarte).toBeFocused();
    await expect(s.contador).toHaveText('Paso 1 de 4');

    await page.keyboard.press(' ');
    await expect(s.reproducir).toHaveText('Reproducir');
    await expect(s.contador).toHaveText('Paso 1 de 4');

    await page.keyboard.press('ArrowLeft');
    await expect(e.entrega).toBeChecked();
    await expect(s.contador).toHaveText('Paso 1 de 6');
  });

  test('con el foco en el resto de la simulación, los atajos siguen funcionando', async ({
    page,
  }) => {
    const simulacion = await abrirSimulacion(page);
    const e = selector(simulacion);
    const s = partes(simulacion);

    await e.descarte.check();
    await simulacion.focus();
    await page.keyboard.press('ArrowRight');
    await expect(s.contador).toHaveText('Paso 2 de 4');
    await page.keyboard.press('ArrowLeft');
    await expect(s.contador).toHaveText('Paso 1 de 4');
    await page.keyboard.press(' ');
    await expect(s.reproducir).toHaveText('Pausar');
    await page.keyboard.press(' ');
    await expect(s.reproducir).toHaveText('Reproducir');
  });

  test('es accesible y no desborda la página con el otro escenario', async ({ page }) => {
    const simulacion = await abrirSimulacion(page);
    await selector(simulacion).descarte.check();
    await partes(simulacion).siguiente.click();
    await revisarAccesibilidad(page, '[aria-labelledby="simulacion"]');
    await sinScrollHorizontal(page);
  });
});

test('una simulación con una sola timeline no muestra selector de escenarios', async ({ page }) => {
  await page.goto('modulos/ejemplo/');
  const simulacion = page.getByRole('region', { name: /^Simulación de ejemplo/ });
  await simulacion.scrollIntoViewIfNeeded();
  await expect(simulacion.getByText(/^Paso 1 de \d+$/)).toBeVisible();
  await expect(simulacion.getByRole('radio')).toHaveCount(0);
  await expect(simulacion.getByRole('group', { name: 'Escenario' })).toHaveCount(0);
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
