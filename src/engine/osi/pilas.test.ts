import { describe, expect, it } from 'vitest';
import { CAPAS, type Capa } from '../core/capas';
import { longitudTotal, partesEnElCable } from '../core/pdu';
import type { Encabezado } from '../core/timeline';
import {
  BYTES_ETHERNET,
  BYTES_FCS,
  BYTES_IPV4,
  BYTES_TCP,
  BYTES_TRAMA_MINIMA,
  MENSAJE_HTTP,
  PILA_OSI,
  PILA_TCPIP,
  PILAS,
  type ContextoDeCapa,
  type Pila,
} from './pilas';

// [Ejemplo] Direcciones de documentación (RFC 5737 y RFC 9542), solo para estos tests.
const contexto: ContextoDeCapa = {
  origen: { etiqueta: 'A', mac: '00-00-5E-00-53-0A', ipv4: '192.0.2.10' },
  destino: { etiqueta: 'B', mac: '00-00-5E-00-53-0B', ipv4: '192.0.2.11' },
  salto: {
    emisor: { etiqueta: 'A', mac: '00-00-5E-00-53-0A' },
    receptor: { etiqueta: 'B', mac: '00-00-5E-00-53-0B' },
  },
};

/** Lo que agrega cada capa, de la 1 a la 7, como en `Paquete.encabezados`. */
function partes(pila: Pila, desde: Capa = 1): Encabezado[] {
  return CAPAS.filter((c) => c >= desde).flatMap((c) => {
    const { encabezado, cola } = pila.capas[c];
    return [encabezado?.(contexto), cola?.(contexto)].filter((e) => e !== undefined);
  });
}

describe('pila TCP/IP real', () => {
  it('los tamaños son los mínimos reales: Ethernet 14 + FCS 4, IPv4 20, TCP 20', () => {
    expect(BYTES_ETHERNET).toBe(14);
    expect(BYTES_FCS).toBe(4);
    expect(BYTES_IPV4).toBe(20);
    expect(BYTES_TCP).toBe(20);
    expect(partes(PILA_TCPIP).map((e) => [e.nombre, e.bytes])).toEqual([
      ['Ethernet', 14],
      ['FCS', 4],
      ['IPv4', 20],
      ['TCP', 20],
    ]);
  });

  it('el pedido HTTP mide lo mismo que el mensaje en UTF-8 y al menos 6 bytes', () => {
    expect(PILA_TCPIP.datos.bytes).toBe(37);
    expect(new TextEncoder().encode(MENSAJE_HTTP)).toHaveLength(37);
    expect(PILA_TCPIP.datos.bytes).toBeGreaterThanOrEqual(6);
  });

  it('la trama completa mide al menos 64 bytes, así que no hace falta relleno', () => {
    const trama = { encabezados: partes(PILA_TCPIP), datos: PILA_TCPIP.datos };
    expect(longitudTotal(trama)).toBe(14 + 20 + 20 + 37 + 4);
    expect(longitudTotal(trama)).toBeGreaterThanOrEqual(BYTES_TRAMA_MINIMA);
    // RFC 894: el campo de datos de Ethernet (el datagrama) mide al menos 46 bytes.
    expect(longitudTotal({ encabezados: partes(PILA_TCPIP, 3), datos: PILA_TCPIP.datos })).toBe(77);
  });

  it('en el cable van Ethernet, IPv4, TCP, datos y FCS', () => {
    const trama = { encabezados: partes(PILA_TCPIP), datos: PILA_TCPIP.datos };
    expect(
      partesEnElCable(trama).map((p) => (p.tipo === 'datos' ? 'datos' : p.encabezado.nombre)),
    ).toEqual(['Ethernet', 'IPv4', 'TCP', 'datos', 'FCS']);
  });

  it('cada campo de entrega está en el encabezado de su capa con el mismo valor', () => {
    const entregas = CAPAS.flatMap((capa) => {
      const { entrega, encabezado } = PILA_TCPIP.capas[capa];
      if (entrega === undefined) return [];
      const campo = encabezado?.(contexto).campos.find((c) => c.nombre === entrega.campo);
      return [[capa, campo?.valor, entrega.para]];
    });
    expect(entregas).toEqual([
      [2, '0x0800', 'IPv4'],
      [3, '6', 'TCP'],
      [4, '80', 'el servidor web (HTTP)'],
    ]);
  });

  it('muestra las direcciones de origen y destino de cada capa', () => {
    const campos = (capa: Capa) =>
      Object.fromEntries(
        (PILA_TCPIP.capas[capa].encabezado?.(contexto).campos ?? []).map((c) => [
          c.nombre,
          c.valor,
        ]),
      );
    expect(campos(2)).toEqual({
      'MAC destino': '00-00-5E-00-53-0B',
      'MAC origen': '00-00-5E-00-53-0A',
      EtherType: '0x0800',
    });
    expect(campos(3)).toEqual({
      Protocolo: '6',
      'IP origen': '192.0.2.10',
      'IP destino': '192.0.2.11',
    });
    expect(campos(4)).toEqual({ 'Puerto origen': '49152', 'Puerto destino': '80' });
  });

  it('las capas 5 y 6 no agregan nada y lo explican', () => {
    for (const capa of [5, 6] as const) {
      const c = PILA_TCPIP.capas[capa];
      expect(c.encabezado).toBeUndefined();
      expect(c.cola).toBeUndefined();
      expect(c.alEnviar(contexto)).toMatch(/[Nn]o se agrega ningún encabezado/);
    }
  });

  it('avisa qué dato falta si el escenario no trae una dirección', () => {
    const sinIp = { ...contexto, destino: { etiqueta: 'B' } };
    expect(() => PILA_TCPIP.capas[3].encabezado?.(sinIp)).toThrow(/IPv4 de B/);
  });

  it('marca como ejemplo el mensaje y la presentación', () => {
    expect(PILA_TCPIP.datos.descripcion).toMatch(/^\[Ejemplo\]/);
    expect(PILA_TCPIP.presentacion(contexto)).toMatch(/^\[Ejemplo\]/);
  });
});

describe('pila OSI genérica', () => {
  it('agrega AH, PH, SH, TH, NH y LH, más la cola LT, sin tamaños ni campos', () => {
    expect(partes(PILA_OSI).map((e) => [e.nombre, e.parte ?? 'encabezado'])).toEqual([
      ['LH', 'encabezado'],
      ['LT', 'cola'],
      ['NH', 'encabezado'],
      ['TH', 'encabezado'],
      ['SH', 'encabezado'],
      ['PH', 'encabezado'],
      ['AH', 'encabezado'],
    ]);
    for (const e of partes(PILA_OSI)) {
      expect(e).not.toHaveProperty('bytes');
      expect(e.campos).toEqual([]);
    }
    expect(PILA_OSI.datos).not.toHaveProperty('bytes');
  });

  it('declara que es el modelo y no un protocolo real', () => {
    expect(PILA_OSI.presentacion(contexto)).toMatch(/no un protocolo real/);
  });
});

describe('las dos pilas', () => {
  it.each(PILAS.map((p) => [p.nombre, p] as const))(
    '%s: cada encabezado es de su capa y solo la capa 2 tiene cola y control de errores',
    (_, pila) => {
      for (const capa of CAPAS) {
        const c = pila.capas[capa];
        expect(c.encabezado?.(contexto).capa ?? capa).toBe(capa);
        expect(c.cola?.(contexto).capa ?? capa).toBe(capa);
        if (c.cola !== undefined) expect(c.encabezado).toBeDefined();
        expect(c.cola !== undefined).toBe(capa === 2);
        expect(c.alDescartar !== undefined).toBe(capa === 2);
        expect(c.alEnviar(contexto).trim()).not.toBe('');
        expect(c.alRecibir(contexto).trim()).not.toBe('');
      }
      expect(pila.capas[1].encabezado).toBeUndefined();
    },
  );
});
