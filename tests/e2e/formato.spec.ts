import { expect, test, type Locator, type Page } from '@playwright/test';
import { revisarAccesibilidad, sinScrollHorizontal } from './ayudas';

/** Campos del encabezado IPv4 de src/engine/demo/encabezado-ipv4.ts, en orden. */
const CAMPOS = [
  'Versión',
  'IHL',
  'Tipo de servicio',
  'Longitud total',
  'Identificación',
  'Indicadores',
  'Desplazamiento de fragmento',
  'Tiempo de vida',
  'Protocolo',
  'Checksum del encabezado',
  'Dirección de origen',
  'Dirección de destino',
];

/**
 * Lleva el componente de /demo/ a la vista, espera a que la isla se hidrate y devuelve la
 * vista que corresponde al ancho (rejilla o lista).
 */
async function abrirFormato(page: Page) {
  const formato = page.getByRole('group', { name: 'Encabezado IPv4' });
  await formato.scrollIntoViewIfNeeded();
  await expect(page.locator('astro-island[component-url*="HeaderFormat"]')).not.toHaveAttribute(
    'ssr',
  );
  const vista = formato.locator('[data-vista]:visible');
  await expect(vista).toHaveCount(1);
  return { formato, vista, detalle: formato.locator('[aria-live="polite"]') };
}

const campo = (vista: Locator, nombre: string) => vista.locator(`[data-campo="${nombre}"]`);

test.describe('demostración: formato de encabezado', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('demo/');
  });

  test('muestra la rejilla en escritorio y la lista en celular', async ({ page }, info) => {
    const { formato, vista } = await abrirFormato(page);
    const esperada = info.project.name === 'celular' ? 'lista' : 'rejilla';
    await expect(vista).toHaveAttribute('data-vista', esperada);
    await expect(formato.locator(`[data-vista]:not([data-vista="${esperada}"])`)).toBeHidden();
    await expect(formato).toContainText('Capa 3 · Red · 20 bytes');
    await sinScrollHorizontal(page);
  });

  test('los campos se recorren con el teclado y muestran su descripción', async ({ page }) => {
    const { formato, vista, detalle } = await abrirFormato(page);
    await expect(detalle).toContainText('Elegí un campo');

    // Desde el selector de formato, Tab entra a los campos en el orden del encabezado.
    await formato.getByRole('radio', { name: 'Por campo', exact: true }).focus();
    for (const nombre of CAMPOS) {
      await page.keyboard.press('Tab');
      await expect(campo(vista, nombre)).toBeFocused();
      await expect(campo(vista, nombre)).toHaveAttribute('aria-pressed', 'true');
      await expect(detalle).toContainText(nombre);
    }
    await expect(detalle).toContainText('desde el bit 128 hasta el 159');
    await expect(detalle).toContainText('RFC 5737');
  });

  test('el cambio de formato actualiza los valores', async ({ page }) => {
    const { formato, vista } = await abrirFormato(page);
    const version = campo(vista, 'Versión');
    const origen = campo(vista, 'Dirección de origen');

    await expect(version).toContainText('4');
    await expect(origen).toContainText('192.0.2.10');

    await formato.getByRole('radio', { name: 'Binario', exact: true }).check();
    await expect(version).toContainText('0100');
    await expect(campo(vista, 'Indicadores')).toContainText('010');
    await expect(origen).toContainText('11000000000000000000001000001010');

    await formato.getByRole('radio', { name: 'Hexadecimal', exact: true }).check();
    await expect(version).toContainText('0x4');
    await expect(origen).toContainText('0xC000020A');

    await formato.getByRole('radio', { name: 'Decimal', exact: true }).check();
    await expect(origen).toContainText('3221225994');

    await formato.getByRole('radio', { name: 'Por campo', exact: true }).check();
    await expect(origen).toContainText('192.0.2.10');
  });

  test('el checksum del ejemplo lo calcula el motor', async ({ page }) => {
    const { formato, vista } = await abrirFormato(page);
    await formato.getByRole('radio', { name: 'Hexadecimal', exact: true }).check();
    // Calculado con RFC 1071 sobre el encabezado con el campo en 0; ver encabezado-ipv4.test.ts.
    await expect(campo(vista, 'Checksum del encabezado')).toContainText('0x3211');
  });

  test('no tiene problemas de accesibilidad', async ({ page }) => {
    const { vista } = await abrirFormato(page);
    await campo(vista, 'Tiempo de vida').click();
    await revisarAccesibilidad(page, 'section[aria-labelledby="formato"]');
  });
});
