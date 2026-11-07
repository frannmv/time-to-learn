import { expect, test, type Locator, type Page } from '@playwright/test';
import { revisarAccesibilidad, sinScrollHorizontal } from './ayudas';

/** Debe coincidir con CLAVE_PROGRESO de src/lib/progreso.ts. */
const CLAVE_PROGRESO = 'ttl:progreso:v1';

/** Respuestas correctas del quiz de /demo/ (índices desde 0). */
const CORRECTAS_DEMO = [1, 0, 2];

/**
 * Lleva el quiz a la vista y espera a que la isla se hidrate: con `client:visible`, Astro
 * quita el atributo `ssr` de `astro-island` al terminar.
 */
async function abrirQuiz(seccion: Locator): Promise<Locator> {
  await seccion.scrollIntoViewIfNeeded();
  const isla = seccion.locator('astro-island[component-url*="Quiz"]');
  await expect(isla).not.toHaveAttribute('ssr');
  return isla;
}

const seccionDemo = (page: Page) => page.locator('section[aria-labelledby="quiz"]');

/** Responde cada pregunta con el mouse y la comprueba. */
async function responder(quiz: Locator, respuestas: readonly number[]): Promise<void> {
  const preguntas = quiz.getByRole('group');
  for (const [i, opcion] of respuestas.entries()) {
    const pregunta = preguntas.nth(i);
    await pregunta.getByRole('radio').nth(opcion).check();
    await pregunta.getByRole('button', { name: 'Comprobar' }).click();
  }
}

/** Bloquea `localStorage`: leerlo lanza un error, como en algunos modos privados. */
async function bloquearAlmacenamiento(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Almacenamiento bloqueado', 'SecurityError');
      },
    });
  });
}

test.describe('demostración: Callout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('demo/');
  });

  test('cada variante tiene su título en texto, no solo color e ícono', async ({ page }) => {
    const recuadros = page.getByTestId('demo-callouts').getByRole('note');
    await expect(recuadros).toHaveCount(5);
    const titulos = ['Resumen', 'Nota', 'Simplificación', 'Advertencia', 'Título propio'];
    for (const [i, titulo] of titulos.entries()) {
      await expect(recuadros.nth(i).locator('.titulo')).toHaveText(titulo);
      await expect(recuadros.nth(i).locator('svg')).toHaveAttribute('aria-hidden', 'true');
    }
  });

  test('no carga JavaScript propio', async ({ page }) => {
    await expect(page.locator('section[aria-labelledby="callout"] astro-island')).toHaveCount(0);
    await expect(page.locator('section[aria-labelledby="callout"] script')).toHaveCount(0);
  });

  test('la sección es accesible y no desborda', async ({ page }) => {
    await revisarAccesibilidad(page, '[aria-labelledby="callout"]');
    await sinScrollHorizontal(page);
  });
});

test.describe('demostración: Qué pasa si', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('demo/');
  });

  test('la pregunta es un título y la simulación es opcional', async ({ page }) => {
    const bloques = page.locator('section[aria-labelledby="que-pasa-si"] [data-que-pasa-si]');
    await expect(bloques).toHaveCount(2);

    const [sinSimulacion, conSimulacion] = [bloques.nth(0), bloques.nth(1)];
    await expect(sinSimulacion.getByRole('heading', { level: 3 })).toHaveText(
      '[Ejemplo] ¿Qué pasa si B no está?',
    );
    await expect(sinSimulacion).toContainText('sin B, el mensaje no tiene por dónde llegar');
    // Sin simulación, el bloque no carga JavaScript.
    await expect(sinSimulacion.locator('astro-island')).toHaveCount(0);

    const simulacion = conSimulacion.getByRole('region', {
      name: 'Simulación del caso: el mensaje llega a C',
    });
    await simulacion.scrollIntoViewIfNeeded();
    await expect(conSimulacion.locator('astro-island')).not.toHaveAttribute('ssr');
    await simulacion.getByRole('button', { name: 'Siguiente' }).click();
    await expect(simulacion.getByText(/^Paso \d+ de \d+$/)).toHaveText('Paso 2 de 5');
  });

  test('la sección es accesible y no desborda', async ({ page }) => {
    await revisarAccesibilidad(page, '[aria-labelledby="que-pasa-si"]');
    await sinScrollHorizontal(page);
  });
});

test.describe('demostración: Quiz', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('demo/');
  });

  test('se completa solo con teclado y dice el resultado en texto', async ({ page }) => {
    const quiz = await abrirQuiz(seccionDemo(page));
    const preguntas = quiz.getByRole('group');
    await expect(preguntas).toHaveCount(3);
    const [p1, p2, p3] = [preguntas.nth(0), preguntas.nth(1), preguntas.nth(2)];

    // Pregunta 1: las flechas eligen la opción; elegir no corrige.
    await p1.getByRole('radio').first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(p1.getByRole('radio', { name: 'Por B' })).toBeChecked();
    await expect(p1).not.toContainText('Correcta');
    await page.keyboard.press('Tab');
    await expect(p1.getByRole('button', { name: 'Comprobar' })).toBeFocused();
    await page.keyboard.press('Enter');

    const devolucion1 = p1.locator('[data-resultado]');
    await expect(devolucion1).toBeFocused();
    await expect(devolucion1).toContainText('Correcta.');
    await expect(devolucion1).toContainText('La topología del escenario es A — B — C');
    await expect(p1.getByRole('radio', { name: /Por B/ })).toBeDisabled();

    // Pregunta 2: Tab sigue a la próxima pregunta y espacio elige.
    await page.keyboard.press('Tab');
    await expect(p2.getByRole('radio').first()).toBeFocused();
    await page.keyboard.press('Space');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space');
    await expect(p2.locator('[data-resultado]')).toContainText('Correcta.');

    // Pregunta 3: una respuesta incorrecta.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    const devolucion3 = p3.locator('[data-resultado]');
    await expect(devolucion3).toContainText('Incorrecta.');
    await expect(devolucion3).toContainText('no representa ningún protocolo');
    await expect(p3.getByText('(tu respuesta)')).toBeVisible();
    await expect(p3.locator('label', { hasText: '(respuesta correcta)' })).toContainText(
      'Ninguno: es ficticio',
    );

    await expect(quiz.getByRole('status')).toContainText('Resultado: 2 de 3');

    // Reintentar vuelve a empezar y deja el foco en la primera opción.
    await page.keyboard.press('Tab');
    await expect(quiz.getByRole('button', { name: 'Reintentar' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(p1.getByRole('radio').first()).toBeFocused();
    await expect(quiz.locator('[data-resultado]')).toHaveCount(0);
    await expect(quiz.getByRole('radio', { checked: true })).toHaveCount(0);
  });

  test('«Comprobar» sin elegir una opción no hace nada', async ({ page }) => {
    const quiz = await abrirQuiz(seccionDemo(page));
    const comprobar = quiz.getByRole('group').first().getByRole('button', { name: 'Comprobar' });
    await expect(comprobar).toHaveAttribute('aria-disabled', 'true');
    // Playwright no hace clic en botones con aria-disabled: se presiona con el teclado.
    await comprobar.focus();
    await page.keyboard.press('Enter');
    await expect(comprobar).toBeFocused();
    await expect(quiz.locator('[data-resultado]')).toHaveCount(0);
  });

  test('el resultado se guarda, persiste al recargar y conserva el mejor puntaje', async ({
    page,
  }) => {
    let quiz = await abrirQuiz(seccionDemo(page));
    await responder(quiz, CORRECTAS_DEMO);
    await expect(quiz.getByRole('status')).toContainText('Resultado: 3 de 3');
    await expect(quiz.getByRole('status')).toContainText('Tu mejor puntaje: 3 de 3.');

    const guardado = await page.evaluate((clave) => localStorage.getItem(clave), CLAVE_PROGRESO);
    expect(JSON.parse(guardado ?? 'null')).toEqual({
      version: 1,
      modulos: { demo: { completado: true, mejor: 3, total: 3 } },
    });

    await page.reload();
    quiz = await abrirQuiz(seccionDemo(page));
    await expect(quiz.getByTestId('quiz-previo')).toHaveText(
      'Ya completaste este quiz. Tu mejor puntaje: 3 de 3.',
    );

    // Un intento peor no baja el mejor puntaje.
    await responder(quiz, [0, 1, 0]);
    await expect(quiz.getByRole('status')).toContainText('Resultado: 0 de 3');
    await expect(quiz.getByRole('status')).toContainText('Tu mejor puntaje: 3 de 3.');
  });

  test('sin almacenamiento, el quiz funciona igual y avisa que no recuerda', async ({ page }) => {
    const errores: Error[] = [];
    page.on('pageerror', (error) => errores.push(error));
    await bloquearAlmacenamiento(page);
    await page.reload();

    const quiz = await abrirQuiz(seccionDemo(page));
    await responder(quiz, CORRECTAS_DEMO);
    await expect(quiz.getByRole('status')).toContainText('Resultado: 3 de 3');
    await expect(quiz.getByRole('status')).toContainText('no permite guardar el progreso');
    await expect(quiz.getByRole('status')).not.toContainText('mejor puntaje');

    await page.reload();
    await abrirQuiz(seccionDemo(page));
    await expect(page.getByTestId('quiz-previo')).toHaveCount(0);
    expect(errores).toEqual([]);
  });

  test('la sección es accesible y no desborda, antes y después de responder', async ({ page }) => {
    const quiz = await abrirQuiz(seccionDemo(page));
    await revisarAccesibilidad(page, '[aria-labelledby="quiz"]');
    await responder(quiz, [1, 1, 2]);
    await expect(quiz.getByRole('status')).toContainText('Resultado: 2 de 3');
    await revisarAccesibilidad(page, '[aria-labelledby="quiz"]');
    await sinScrollHorizontal(page);
  });
});

test.describe('módulo de ejemplo: quiz, qué pasa si y resumen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('modulos/ejemplo/');
  });

  test('el quiz se dibuja desde el frontmatter', async ({ page }) => {
    const quiz = await abrirQuiz(page.getByRole('region', { name: 'Quiz' }));
    const preguntas = quiz.getByRole('group');
    await expect(preguntas).toHaveCount(3);
    await expect(preguntas.first()).toContainText(
      '[Ejemplo] ¿Sobre qué unidades suma el checksum de Internet?',
    );
    await expect(preguntas.first().getByRole('radio')).toHaveCount(3);

    await responder(quiz, [1, 1, 1]);
    await expect(quiz.getByRole('status')).toContainText('Resultado: 3 de 3');
    await expect(preguntas.first().locator('[data-resultado]')).toContainText('RFC 1071 §1');
  });

  test('respeta el orden de la plantilla: Resumen → Quiz → Fuentes', async ({ page }) => {
    const orden = await page.evaluate(() => {
      const resumen = [...document.querySelectorAll('h2')].find((h) => h.textContent === 'Resumen');
      const quiz = document.querySelector('[data-quiz]');
      const fuentes = document.querySelector('section[aria-labelledby="fuentes"]');
      if (!resumen || !quiz || !fuentes) return null;
      const sigue = (a: Node, b: Node) =>
        Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return sigue(resumen, quiz) && sigue(quiz, fuentes);
    });
    expect(orden).toBe(true);
  });

  test('usa WhatIf y Callout sin cargar JavaScript propio', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 3, name: '¿Qué pasa si la cantidad de bytes es impar?' }),
    ).toBeVisible();
    await expect(page.getByRole('note').filter({ hasText: 'Simplificación' })).toBeVisible();
    const resumen = page.getByRole('note').filter({ hasText: 'Para repasar' });
    await expect(resumen.getByRole('listitem')).toHaveCount(3);
    await expect(resumen).toContainText('220D');
    // La única isla de la página es el quiz.
    await expect(page.locator('astro-island')).toHaveCount(1);
    await expect(page.locator('astro-island')).toHaveAttribute('component-url', /Quiz/);
  });

  test('la página es accesible y no desborda', async ({ page }) => {
    await abrirQuiz(page.getByRole('region', { name: 'Quiz' }));
    await revisarAccesibilidad(page);
    await sinScrollHorizontal(page);
  });
});
