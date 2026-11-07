import { expect, test, type Page } from '@playwright/test';
import { sinScrollHorizontal } from './ayudas';

const BASE = '/time-to-learn/';

const CAPAS = [
  'Física',
  'Enlace de datos',
  'Red',
  'Transporte',
  'Sesión',
  'Presentación',
  'Aplicación',
];

/** Enlaces internos de la página (los que no salen a otro sitio ni son anclas). */
const enlacesInternos = (page: Page) =>
  page
    .locator('a[href]')
    .evaluateAll((enlaces) =>
      enlaces
        .map((a) => a.getAttribute('href') ?? '')
        .filter((href) => !/^(?:[a-z]+:|#)/i.test(href)),
    );

const esCelular = (page: Page) => (page.viewportSize()?.width ?? 0) < 600;

test.describe('inicio', () => {
  test('muestra el estado vacío y no lista el módulo oculto', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('indice-vacio')).toContainText(
      'El primer módulo llega en la Etapa 2',
    );
    await expect(page.locator(`a[href*="modulos/ejemplo"]`)).toHaveCount(0);
    await sinScrollHorizontal(page);
  });

  test('tiene encabezado, navegación principal y pie con licencias', async ({ page }) => {
    await page.goto('./');
    const principal = page.getByRole('navigation', { name: 'Principal' });
    await expect(principal.getByRole('link', { name: 'Inicio' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(principal.getByRole('link', { name: 'Capas' })).toBeVisible();
    const pie = page.getByRole('contentinfo');
    await expect(pie.getByRole('link', { name: 'MIT' })).toBeVisible();
    await expect(pie.getByRole('link', { name: 'CC BY-SA 4.0' })).toBeVisible();
  });
});

test.describe('página de módulo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('modulos/ejemplo/');
  });

  test('muestra el encabezado del módulo', async ({ page }) => {
    await expect(page).toHaveTitle(/Módulo de ejemplo/);
    const encabezado = page.locator('.encabezado-modulo');
    await expect(encabezado.getByRole('heading', { level: 1 })).toHaveText('Módulo de ejemplo');
    await expect(encabezado).toContainText('3 · Red');
    await expect(encabezado).toContainText('5 min');
    await expect(encabezado).toContainText('Ninguno');
  });

  test('muestra el cuerpo, el quiz y las fuentes', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Idea central' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Quiz' }).getByRole('group')).toHaveCount(3);
    const fuentes = page.getByRole('region', { name: 'Fuentes' });
    await expect(fuentes).toContainText('RFC 1071');
    await expect(
      fuentes.getByRole('link', { name: 'Computing the Internet Checksum' }),
    ).toHaveAttribute('href', 'https://www.rfc-editor.org/rfc/rfc1071');
  });

  test('al estar oculto, pide no ser indexado y no tiene anterior ni siguiente', async ({
    page,
  }) => {
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await expect(page.getByRole('navigation', { name: 'Módulo anterior y siguiente' })).toHaveCount(
      0,
    );
  });

  test('el menú de módulos no lista el módulo oculto', async ({ page }) => {
    const menu = page.locator('.menu-modulos');
    await expect(menu).toContainText('Todavía no hay módulos');
    await expect(menu.getByRole('link')).toHaveCount(0);
    await sinScrollHorizontal(page);
  });
});

test.describe('módulos por capa', () => {
  test('lista las 7 capas con número y nombre, sin el módulo oculto', async ({ page }) => {
    await page.goto('capas/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Módulos por capa');
    const titulos = page.getByRole('heading', { level: 2 });
    await expect(titulos).toHaveText(CAPAS.map((nombre, i) => `Capa ${i + 1} · ${nombre}`));
    await expect(page.locator('main a[href*="modulos/ejemplo"]')).toHaveCount(0);
    await expect(
      page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Capas' }),
    ).toHaveAttribute('aria-current', 'page');
    await sinScrollHorizontal(page);
  });
});

test.describe('página 404', () => {
  test('una ruta inexistente muestra la 404 en español, con el layout', async ({ page }) => {
    const respuesta = await page.goto('no-existe/');
    expect(respuesta?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página no encontrada');
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', BASE);
  });
});

test.describe('enlaces internos', () => {
  for (const ruta of ['./', 'capas/', 'modulos/ejemplo/', 'demo/', 'no-existe/']) {
    test(`en «${ruta}» todos empiezan con el base del sitio`, async ({ page }) => {
      await page.goto(ruta);
      const internos = await enlacesInternos(page);
      expect(internos.length).toBeGreaterThan(0);
      for (const href of internos) expect(href).toMatch(new RegExp(`^${BASE}`));
    });
  }
});

test.describe('teclado', () => {
  test('la navegación se recorre con Tab y el foco es visible', async ({ page }) => {
    await page.goto('capas/');
    const esperados = ['Saltar al contenido', 'TimeToLearn · TTL', 'Inicio', 'Capas'];
    for (const nombre of esperados) {
      await page.keyboard.press('Tab');
      const enfocado = page.locator(':focus');
      await expect(enfocado).toHaveText(nombre);
      await expect(enfocado).toBeVisible();
      const contorno = await enfocado.evaluate((el) => getComputedStyle(el).outlineStyle);
      expect(contorno).not.toBe('none');
    }
  });

  test('el enlace para saltar lleva al contenido', async ({ page }) => {
    await page.goto('capas/');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#contenido$/);
  });

  test('en celular, el menú de módulos abre y cierra con teclado', async ({ page }) => {
    test.skip(!esCelular(page), 'el menú desplegable es solo para celular');
    await page.goto('modulos/ejemplo/');
    const menu = page.locator('.menu-modulos');
    const resumen = menu.locator('summary');
    const nav = page.getByRole('navigation', { name: 'Módulos por bloque' });

    await expect(nav).toBeHidden();
    await resumen.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveAttribute('open', '');
    await expect(nav).toBeVisible();
    await page.keyboard.press('Space');
    await expect(menu).not.toHaveAttribute('open', '');
    await expect(nav).toBeHidden();
  });

  test('en escritorio, el menú de módulos queda siempre visible', async ({ page }) => {
    test.skip(esCelular(page), 'en celular el menú es desplegable');
    await page.goto('modulos/ejemplo/');
    await expect(page.locator('.menu-modulos summary')).toBeHidden();
    await expect(page.getByRole('navigation', { name: 'Módulos por bloque' })).toBeVisible();
  });
});

test.describe('demostración: layout del sitio', () => {
  test('muestra las marcas de las 7 capas con número y nombre', async ({ page }) => {
    await page.goto('demo/');
    const seccion = page.getByRole('region', { name: 'Layout del sitio' });
    await expect(
      seccion.getByRole('list', { name: 'Marcas de capa', exact: true }).getByRole('listitem'),
    ).toHaveText(CAPAS.map((nombre, i) => `${i + 1} · ${nombre}`));
    const compactas = seccion
      .getByRole('list', { name: 'Marcas de capa compactas' })
      .getByRole('listitem');
    await expect(compactas).toHaveCount(7);
    await expect(compactas.first()).toContainText('Capa 1: Física');
    const encabezado = page.getByTestId('demo-encabezado');
    await expect(encabezado).toContainText('4 · Transporte');
    await expect(encabezado).toContainText('3 · Red');
    await expect(encabezado.getByRole('link', { name: '[Ejemplo] Módulo previo' })).toBeVisible();
  });
});
