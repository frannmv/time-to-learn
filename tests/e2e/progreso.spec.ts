import { expect, test, type Locator, type Page } from '@playwright/test';
import { revisarAccesibilidad, sinScrollHorizontal } from './ayudas';

/** Debe coincidir con CLAVE_PROGRESO de src/lib/progreso.ts. */
const CLAVE_PROGRESO = 'ttl:progreso:v1';

/** Respuestas correctas del quiz de /demo/ (índices desde 0). */
const CORRECTAS_DEMO = [1, 0, 2];

/** Espera a que una isla con `client:visible` se hidrate (Astro le quita `ssr` al terminar). */
async function hidratar(contenedor: Locator, componente: string): Promise<Locator> {
  await contenedor.scrollIntoViewIfNeeded();
  const isla = contenedor.locator(`astro-island[component-url*="${componente}"]`);
  await expect(isla).not.toHaveAttribute('ssr');
  return isla;
}

/** Marcas «Completado» visibles del índice de ejemplo (las ocultas también están en el DOM). */
const marcasVisibles = (page: Page) =>
  page.getByTestId('demo-ttl-indice').locator('[data-marca-completado]:visible');

const indicadorDemo = (page: Page) => hidratar(page.getByTestId('demo-ttl'), 'TtlProgress');

/** Termina el quiz de /demo/ (la cantidad de aciertos no importa para completarlo). */
async function completarQuizDemo(page: Page): Promise<void> {
  const quiz = await hidratar(page.locator('section[aria-labelledby="quiz"]'), 'Quiz');
  const preguntas = quiz.getByRole('group');
  for (const [i, opcion] of CORRECTAS_DEMO.entries()) {
    await preguntas.nth(i).getByRole('radio').nth(opcion).check();
    await preguntas.nth(i).getByRole('button', { name: 'Comprobar' }).click();
  }
  await expect(quiz.getByRole('status')).toContainText('Resultado: 3 de 3');
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

test.describe('indicador TTL en /demo/', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('demo/');
  });

  test('empieza en 0 y la ruta tiene un punto por módulo, ninguno relleno', async ({ page }) => {
    const ttl = await indicadorDemo(page);
    await expect(ttl.getByTestId('ttl-saltos')).toHaveText('Progreso TTL: 0 de 5 saltos');
    await expect(ttl.getByTestId('ttl-completados')).toHaveText(
      'Todavía no completaste ningún módulo.',
    );
    const puntos = ttl.locator('ol li');
    await expect(puntos).toHaveCount(5);
    await expect(ttl.locator('ol')).toHaveAttribute('aria-hidden', 'true');
    await expect(ttl.locator('li[data-completado="true"]')).toHaveCount(0);
    await expect(puntos.first()).toHaveAttribute('data-capa', '1');
    await expect(marcasVisibles(page)).toHaveCount(0);
  });

  test('completar el quiz suma un salto sin recargar, y persiste al recargar', async ({ page }) => {
    const ttl = await indicadorDemo(page);
    await completarQuizDemo(page);

    await expect(ttl.getByTestId('ttl-saltos')).toHaveText('Progreso TTL: 1 de 5 saltos');
    await expect(ttl.getByTestId('ttl-completados')).toHaveText(
      'Completado: [Ejemplo] Quiz de /demo/.',
    );
    await expect(ttl.locator('li[data-completado="true"]')).toHaveCount(1);
    await expect(ttl.locator('li').nth(2)).toHaveAttribute('data-completado', 'true');

    // La versión detallada (índice) también se actualiza sin recargar.
    await expect(marcasVisibles(page)).toHaveCount(1);
    await expect(marcasVisibles(page)).toHaveAttribute('data-marca-completado', 'demo');
    await expect(marcasVisibles(page)).toHaveText('✓ Completado');

    await page.reload();
    const tras = await indicadorDemo(page);
    await expect(tras.getByTestId('ttl-saltos')).toHaveText('Progreso TTL: 1 de 5 saltos');
    await expect(marcasVisibles(page)).toHaveAttribute('data-marca-completado', 'demo');
  });

  test('reiniciar pide confirmación; cancelar no borra y confirmar vuelve a 0', async ({
    page,
  }) => {
    const ttl = await indicadorDemo(page);
    await completarQuizDemo(page);
    await expect(ttl.getByTestId('ttl-saltos')).toHaveText('Progreso TTL: 1 de 5 saltos');

    const reiniciar = ttl.getByRole('button', { name: 'Reiniciar progreso' });

    // Cancelar con el botón: el foco vuelve a «Reiniciar progreso».
    await reiniciar.click();
    const confirmacion = ttl.getByRole('group', { name: /Borrar el progreso/ });
    await expect(confirmacion).toBeVisible();
    await expect(confirmacion.getByRole('button', { name: 'Cancelar' })).toBeFocused();
    await confirmacion.getByRole('button', { name: 'Cancelar' }).click();
    await expect(confirmacion).toHaveCount(0);
    await expect(reiniciar).toBeFocused();
    await expect(ttl.getByTestId('ttl-saltos')).toHaveText('Progreso TTL: 1 de 5 saltos');

    // Cancelar con Escape.
    await reiniciar.press('Enter');
    await expect(confirmacion).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(confirmacion).toHaveCount(0);
    await expect(reiniciar).toBeFocused();

    // Confirmar con el teclado.
    await reiniciar.press('Enter');
    await page.keyboard.press('Shift+Tab');
    await expect(confirmacion.getByRole('button', { name: 'Sí, reiniciar' })).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(ttl.getByTestId('ttl-saltos')).toHaveText('Progreso TTL: 0 de 5 saltos');
    await expect(ttl.getByRole('status')).toHaveText(
      'Progreso reiniciado: el recorrido vuelve a 0 saltos.',
    );
    await expect(reiniciar).toBeFocused();
    await expect(marcasVisibles(page)).toHaveCount(0);
    // El quiz también se entera: ya no dice que estaba completado.
    await expect(page.getByTestId('quiz-previo')).toHaveCount(0);
    expect(await page.evaluate((clave) => localStorage.getItem(clave), CLAVE_PROGRESO)).toBeNull();

    await page.reload();
    const tras = await indicadorDemo(page);
    await expect(tras.getByTestId('ttl-saltos')).toHaveText('Progreso TTL: 0 de 5 saltos');
  });

  test('no cuenta módulos guardados que no están en el recorrido', async ({ page }) => {
    await page.evaluate((clave) => {
      const modulos = {
        ejemplo: { completado: true, mejor: 3, total: 3 },
        'no-existe': { completado: true, mejor: 1, total: 2 },
        'demo-enlace': { completado: true, mejor: 0, total: 4 },
      };
      localStorage.setItem(clave, JSON.stringify({ version: 1, modulos }));
    }, CLAVE_PROGRESO);
    await page.reload();

    const ttl = await indicadorDemo(page);
    await expect(ttl.getByTestId('ttl-saltos')).toHaveText('Progreso TTL: 1 de 5 saltos');
    await expect(ttl.getByTestId('ttl-completados')).toHaveText('Completado: [Ejemplo] Tramas.');
  });

  test('con el almacenamiento bloqueado muestra 0 y la página no falla', async ({ page }) => {
    const errores: Error[] = [];
    page.on('pageerror', (error) => errores.push(error));
    await bloquearAlmacenamiento(page);
    await page.reload();

    const ttl = await indicadorDemo(page);
    await expect(ttl.getByTestId('ttl-saltos')).toHaveText('Progreso TTL: 0 de 5 saltos');
    await completarQuizDemo(page);
    // Sin almacenamiento no se puede recordar: el recorrido no cambia.
    await expect(ttl.getByTestId('ttl-saltos')).toHaveText('Progreso TTL: 0 de 5 saltos');

    await ttl.getByRole('button', { name: 'Reiniciar progreso' }).click();
    await ttl.getByRole('button', { name: 'Sí, reiniciar' }).click();
    await expect(ttl.getByRole('status')).toContainText('no permite guardar el progreso');
    expect(errores).toEqual([]);
  });

  test('el estado vacío no confunde: sin «0 de 0» ni puntos', async ({ page }) => {
    const vacio = page.getByTestId('demo-ttl-vacio');
    await expect(vacio).toHaveText('Progreso TTL: Todavía no hay módulos para recorrer.');
    await expect(vacio.locator('li')).toHaveCount(0);
    await expect(vacio.locator('astro-island')).toHaveCount(0);
  });

  test('la sección es accesible y no desborda, antes y durante la confirmación', async ({
    page,
  }) => {
    const ttl = await indicadorDemo(page);
    await completarQuizDemo(page);
    await revisarAccesibilidad(page, '[aria-labelledby="indicador-ttl"]');
    await ttl.getByRole('button', { name: 'Reiniciar progreso' }).click();
    await revisarAccesibilidad(page, '[aria-labelledby="indicador-ttl"]');
    await sinScrollHorizontal(page);
  });
});

test.describe('indicador TTL en el encabezado', () => {
  for (const ruta of ['', 'capas/', 'demo/', 'modulos/ejemplo/']) {
    test(`sin módulos visibles muestra el estado vacío sin JavaScript: /${ruta}`, async ({
      page,
    }) => {
      await page.goto(ruta);
      const lugar = page.locator('header.sitio [data-progreso-ttl]');
      await expect(lugar).toHaveText('Progreso TTL: Todavía no hay módulos para recorrer.');
      await expect(lugar.locator('astro-island')).toHaveCount(0);
    });
  }

  test('el módulo oculto completado no suma saltos ni marca el inicio', async ({ page }) => {
    await page.goto('');
    await page.evaluate((clave) => {
      const modulos = { ejemplo: { completado: true, mejor: 3, total: 3 } };
      localStorage.setItem(clave, JSON.stringify({ version: 1, modulos }));
    }, CLAVE_PROGRESO);
    await page.reload();
    await expect(page.locator('header.sitio [data-progreso-ttl]')).toContainText(
      'Todavía no hay módulos para recorrer.',
    );
    await expect(page.locator('[data-marca-completado]')).toHaveCount(0);
    // Sin módulos, el inicio tampoco carga JavaScript.
    await expect(page.locator('script')).toHaveCount(0);
  });
});
