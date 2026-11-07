import { describe, expect, it } from 'vitest';
import { CAPAS, NOMBRE_CAPA } from '../core/capas';
import {
  MODELO_IEEE802,
  MODELO_OSI,
  MODELO_TCPIP,
  MODELOS,
  PDU_OSI,
  PDU_TCPIP,
  capaDelModelo,
  capasCubiertas,
} from './modelos';

describe('modelos de capas', () => {
  it.each(MODELOS.map((m) => [m.nombre, m] as const))(
    '%s cubre cada capa de su alcance exactamente una vez, de abajo hacia arriba',
    (_, modelo) => {
      expect(capasCubiertas(modelo)).toEqual(modelo.alcance);
    },
  );

  it('OSI y TCP/IP describen las siete capas; IEEE 802, solo la física y la de enlace', () => {
    expect(MODELO_OSI.alcance).toEqual(CAPAS);
    expect(MODELO_TCPIP.alcance).toEqual(CAPAS);
    expect(MODELO_IEEE802.alcance).toEqual([1, 2]);
    for (const capa of [3, 4, 5, 6, 7] as const) {
      expect(capaDelModelo(MODELO_IEEE802, capa)).toBeUndefined();
    }
  });

  it('OSI usa los nombres de capas.ts', () => {
    expect(MODELO_OSI.capas.map((c) => c.nombre)).toEqual(CAPAS.map((c) => NOMBRE_CAPA[c]));
  });

  it('TCP/IP tiene cuatro capas y la aplicación cubre las capas OSI 5 a 7', () => {
    expect(MODELO_TCPIP.capas.map((c) => c.nombre)).toEqual([
      'Enlace',
      'Internet',
      'Transporte',
      'Aplicación',
    ]);
    expect(capaDelModelo(MODELO_TCPIP, 5)?.nombre).toBe('Aplicación');
    expect(capaDelModelo(MODELO_TCPIP, 7)?.nombre).toBe('Aplicación');
    expect(capaDelModelo(MODELO_TCPIP, 1)?.nombre).toBe('Enlace');
    expect(capaDelModelo(MODELO_TCPIP, 1)?.otrosNombres).toContain('Interfaz de red');
  });

  it('IEEE 802 divide la capa 2 en MAC (abajo) y LLC (arriba)', () => {
    const enlace = capaDelModelo(MODELO_IEEE802, 2);
    expect(enlace?.subcapas?.map((s) => s.sigla)).toEqual(['MAC', 'LLC']);
  });

  it('los ids de las capas no se repiten entre modelos', () => {
    const ids = MODELOS.flatMap((m) => [
      ...m.capas.map((c) => c.id),
      ...m.capas.flatMap((c) => c.subcapas?.map((s) => s.id) ?? []),
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('nombres de PDU', () => {
  it.each([
    ['OSI genérico', PDU_OSI],
    ['TCP/IP', PDU_TCPIP],
  ] as const)('%s tiene un nombre no vacío para las siete capas', (_, nombres) => {
    for (const capa of CAPAS) expect(nombres[capa].trim()).not.toBe('');
    expect(Object.keys(nombres)).toHaveLength(7);
  });

  it('OSI genérico sigue la notación del apunte', () => {
    expect(CAPAS.map((c) => PDU_OSI[c])).toEqual([
      'Bits',
      'DL-PDU',
      'N-PDU',
      'T-PDU',
      'S-PDU',
      'P-PDU',
      'A-PDU',
    ]);
  });

  it('TCP/IP: trama, datagrama, segmento y datos de la aplicación de la 5 a la 7', () => {
    expect(PDU_TCPIP[2]).toBe('Trama');
    expect(PDU_TCPIP[3]).toBe('Datagrama IP');
    expect(PDU_TCPIP[4]).toBe('Segmento TCP');
    expect(new Set([PDU_TCPIP[5], PDU_TCPIP[6], PDU_TCPIP[7]])).toEqual(
      new Set(['Datos de la aplicación']),
    );
  });
});
