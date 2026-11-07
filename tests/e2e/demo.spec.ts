/**
 * Recorrido consolidado de /demo/ y del módulo de ejemplo (pieza 1.10). Los specs de cada
 * pieza prueban su componente en detalle; este comprueba el conjunto: que toda la página se
 * recorre con Tab, con foco visible y en el orden de las secciones, y que cada sección se usa
 * solo con el teclado, una después de la otra.
 */
import { expect, test, type Page } from '@playwright/test';
import { hidratarTodas, revisarAccesibilidad, sinScrollHorizontal } from './ayudas';

/** Secciones de /demo/ que tienen algo interactivo, en el orden de la página. */
const SECCIONES_CON_FOCO = [
  'simulacion',
  'pila',
  'comparacion',
  'formato',
  'que-pasa-si',
  'quiz',
  'indicador-ttl',
  'layout',
];

/** Respuestas correctas del quiz de /demo/ (índices desde 0). */
const CORRECTAS_DEMO = [1, 0, 2];

interface Parada {
  /** `aria-labelledby` de la sección de /demo/ que contiene el foco, si hay una. */
  seccion: string | null;
  nombre: string;
  /** `outline-style` calculado del elemento con foco. */
  contorno: string;
  visible: boolean;
}

/**
 * Recorre la página con Tab desde el principio y anota cada elemento que recibe el foco.
 * Termina cuando el foco sale de la página o vuelve a un elemento ya visitado.
 */
async function recorrerConTab(page: Page, maximo = 300): Promise<Parada[]> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const paradas: Parada[] = [];
  for (let i = 0; i < maximo; i++) {
    await page.keyboard.press('Tab');
    const parada = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body || el.hasAttribute('data-visitado')) return null;
      el.setAttribute('data-visitado', '');
      const caja = el.getBoundingClientRect();
      const texto = el.getAttribute('aria-label') ?? el.textContent ?? '';
      return {
        seccion: el.closest('.demo > section')?.getAttribute('aria-labelledby') ?? null,
        nombre: texto.replace(/\s+/g, ' ').trim().slice(0, 80) || el.tagName,
        contorno: getComputedStyle(el).outlineStyle,
        visible: caja.width > 0 && caja.height > 0 && el.checkVisibility(),
      };
    });
    if (!parada) break;
    paradas.push(parada);
  }
  return paradas;
}

/** Cada parada tiene que verse y mostrar el contorno de foco. */
function revisarParadas(paradas: Parada[]): void {
  const sinFoco = paradas.filter((p) => !p.visible || p.contorno === 'none');
  expect(sinFoco, 'elementos que reciben el foco sin mostrarlo').toEqual([]);
  expect(paradas[0]?.nombre).toBe('Saltar al contenido');
  // El recorrido llega hasta el pie: nada atrapa el foco en el medio.
  expect(paradas.at(-1)?.nombre).toBe('Código fuente en GitHub');
}

test.describe('recorrido de /demo/ con teclado', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('demo/');
    await hidratarTodas(page);
  });

  test('Tab recorre todas las secciones en orden, con el foco visible', async ({ page }) => {
    const paradas = await recorrerConTab(page);
    revisarParadas(paradas);

    const secciones = paradas
      .map((p) => p.seccion)
      .filter((s, i, todas): s is string => s !== null && s !== todas[i - 1]);
    expect(secciones).toEqual(SECCIONES_CON_FOCO);
  });

  test('cada sección se usa solo con el teclado, de arriba abajo', async ({ page }) => {
    // Simulación: flechas con el foco en la simulación, el selector de escenarios y Enter en
    // los botones.
    const simulacion = page.getByRole('region', { name: 'Simulación de demostración' });
    await simulacion.focus();
    await page.keyboard.press('ArrowRight');
    await expect(simulacion.getByText(/^Paso 2 de \d+$/)).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(simulacion.getByText(/^Paso 1 de \d+$/)).toBeVisible();
    // Selector de escenarios: dentro del grupo de radio, las flechas cambian de escenario.
    const entrega = simulacion.getByRole('radio', { name: 'Entrega a C' });
    await entrega.focus();
    await page.keyboard.press('ArrowRight');
    await expect(simulacion.getByRole('radio', { name: 'B descarta el mensaje' })).toBeChecked();
    await expect(simulacion.getByText(/^Paso 1 de 4$/)).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(entrega).toBeChecked();
    await expect(simulacion.getByText(/^Paso 1 de 6$/)).toBeVisible();
    await simulacion.getByRole('button', { name: 'Siguiente' }).focus();
    await page.keyboard.press('Enter');
    await expect(simulacion.getByText(/^Paso 2 de \d+$/)).toBeVisible();

    // Pila de protocolos: → baja la PDU de capa; con el foco en el diagrama, las flechas lo
    // desplazan y no cambian de paso.
    const pila = page.getByRole('region', { name: 'Simulación de la pila de protocolos' });
    const marca = pila.locator('[data-marca="pdu"]');
    await pila.focus();
    await page.keyboard.press('ArrowRight');
    await expect(marca).toHaveAttribute('data-en', 'a:3');
    await pila.getByRole('region', { name: 'Diagrama de la pila de protocolos' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(marca).toHaveAttribute('data-en', 'a:3');

    // Comparación de modelos: sin JavaScript; lo único enfocable es el contenedor de cada
    // tabla, para desplazarla con las flechas.
    for (const nombre of [
      'Comparación de los modelos OSI, TCP/IP e IEEE 802',
      'Comparación de los modelos OSI y TCP/IP',
    ]) {
      const tabla = page.getByRole('region', { name: nombre });
      await tabla.focus();
      await expect(tabla).toBeFocused();
    }

    // Formato: flechas en el selector y Tab hacia los campos.
    const formato = page.getByRole('group', { name: 'Encabezado IPv4' });
    const porCampo = formato.getByRole('radio', { name: 'Por campo', exact: true });
    await porCampo.focus();
    await page.keyboard.press('ArrowRight');
    await expect(porCampo).not.toBeChecked();
    await page.keyboard.press('ArrowLeft');
    await expect(porCampo).toBeChecked();
    await page.keyboard.press('Tab');
    const version = formato.locator('[data-vista]:visible [data-campo="Versión"]');
    await expect(version).toBeFocused();
    await expect(version).toHaveAttribute('aria-pressed', 'true');

    // Qué pasa si: su simulación avanza sin mover la de arriba.
    const caso = page.getByRole('region', { name: 'Simulación del caso: el mensaje llega a C' });
    await caso.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(caso.getByText(/^Paso 3 de \d+$/)).toBeVisible();
    await expect(simulacion.getByText(/^Paso 2 de \d+$/)).toBeVisible();

    // Quiz: flechas o espacio para elegir, Tab hasta «Comprobar» y Enter.
    const quiz = page.locator('section[aria-labelledby="quiz"]');
    const preguntas = quiz.getByRole('group');
    for (const [i, correcta] of CORRECTAS_DEMO.entries()) {
      const pregunta = preguntas.nth(i);
      await pregunta.getByRole('radio').first().focus();
      if (correcta === 0) await page.keyboard.press('Space');
      for (let k = 0; k < correcta; k++) await page.keyboard.press('ArrowDown');
      await expect(pregunta.getByRole('radio').nth(correcta)).toBeChecked();
      await page.keyboard.press('Tab');
      await expect(pregunta.getByRole('button', { name: 'Comprobar' })).toBeFocused();
      await page.keyboard.press('Enter');
    }
    await expect(quiz.getByRole('status')).toContainText('Resultado: 3 de 3');

    // Indicador TTL: el quiz sumó un salto; se reinicia con Enter y Shift+Tab.
    const ttl = page.getByTestId('demo-ttl');
    const saltos = ttl.getByTestId('ttl-saltos');
    await expect(saltos).toHaveText('Progreso TTL: 1 de 5 saltos');
    const marcas = page.getByTestId('demo-ttl-indice').locator('[data-marca-completado]:visible');
    await expect(marcas).toHaveCount(1);
    await ttl.getByRole('button', { name: 'Reiniciar progreso' }).focus();
    await page.keyboard.press('Enter');
    await expect(ttl.getByRole('button', { name: 'Cancelar' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(ttl.getByRole('button', { name: 'Sí, reiniciar' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(saltos).toHaveText('Progreso TTL: 0 de 5 saltos');
    await expect(marcas).toHaveCount(0);

    // Layout: el enlace al prerrequisito se sigue con Enter.
    await page
      .getByTestId('demo-encabezado')
      .getByRole('link', { name: '[Ejemplo] Módulo previo' })
      .focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/demo\/#layout$/);

    // Después de usar todo, la página sigue accesible y sin desbordar.
    await revisarAccesibilidad(page);
    await sinScrollHorizontal(page);
  });
});

test.describe('recorrido del módulo de ejemplo con teclado', () => {
  test('Tab llega a la simulación, el formato, el quiz y las fuentes', async ({ page }) => {
    await page.goto('modulos/ejemplo/');
    await hidratarTodas(page);
    const paradas = await recorrerConTab(page);
    revisarParadas(paradas);

    const nombres = paradas.map((p) => p.nombre);
    const indice = (patron: RegExp) => nombres.findIndex((n) => patron.test(n));
    const orden = [
      indice(/^Simulación de ejemplo/),
      indice(/^Versión/),
      indice(/^Comprobar$/),
      indice(/Computing the Internet Checksum/),
    ];
    expect(
      orden.every((i) => i >= 0),
      `paradas: ${nombres.join(' | ')}`,
    ).toBe(true);
    expect(orden).toEqual([...orden].sort((a, b) => a - b));
  });
});
