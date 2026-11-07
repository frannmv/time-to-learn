import { describe, expect, it } from 'vitest';
import type { Capa } from '../core/capas';
import { longitudTotal, partesEnElCable } from '../core/pdu';
import { validarTimeline, type Paquete, type Step, type Timeline } from '../core/timeline';
import {
  CAPAS_POR_TIPO,
  HOST_A,
  HOST_B,
  HOST_B_OTRA_RED,
  ROUTER_R,
  simularEncapsulamiento,
  simularModeloOsi,
  simularRouterEnElMedio,
  simularTcpIp,
  simularTramaConError,
  type Intermedio,
} from './encapsulamiento';
import { BYTES_TRAMA_MINIMA, PILA_OSI, PILA_TCPIP } from './pilas';

const ESCENARIOS = [
  ['modelo OSI', simularModeloOsi, 15],
  ['TCP/IP real', simularTcpIp, 15],
  ['trama con error', simularTramaConError, 10],
  ['router en el medio', simularRouterEnElMedio, 21],
] as const;

const paquete = (paso: Step | undefined): Paquete => {
  const p = paso?.paquetes[0];
  if (p === undefined) throw new Error('el paso no tiene paquete');
  return p;
};

/** Dónde está la PDU en cada paso: «a7», «a-b», «b1»… */
const recorrido = (timeline: Timeline) =>
  timeline.pasos.map((paso) => {
    const { ubicacion } = paquete(paso);
    return ubicacion.tipo === 'nodo' ? `${ubicacion.nodo}${ubicacion.capa}` : ubicacion.enlace;
  });

/** Pasos en un nodo, en orden. */
const pasosEn = (timeline: Timeline, nodo: string) =>
  timeline.pasos.filter((paso) => {
    const { ubicacion } = paquete(paso);
    return ubicacion.tipo === 'nodo' && ubicacion.nodo === nodo;
  });

const capaDe = (paso: Step): Capa | undefined => {
  const { ubicacion } = paquete(paso);
  return ubicacion.tipo === 'nodo' ? ubicacion.capa : undefined;
};

const nombres = (p: Paquete) => p.encabezados.map((e) => e.nombre);

const campo = (p: Paquete, encabezado: string, nombre: string) =>
  p.encabezados.find((e) => e.nombre === encabezado)?.campos.find((c) => c.nombre === nombre)
    ?.valor;

describe.each(ESCENARIOS)('escenario %s', (_, simular, cantidad) => {
  it('produce una timeline válida con la cantidad de pasos esperada', () => {
    const timeline = simular();
    expect(validarTimeline(timeline)).toEqual([]);
    expect(timeline.pasos).toHaveLength(cantidad);
  });

  it('es determinístico', () => {
    expect(simular()).toStrictEqual(simular());
    expect(JSON.stringify(simular())).toBe(JSON.stringify(simular()));
  });

  it('sobrevive la ida y vuelta por JSON', () => {
    const timeline = simular();
    expect(JSON.parse(JSON.stringify(timeline))).toStrictEqual(structuredClone(timeline));
  });

  it('cada paso tiene un solo paquete, con nombre de PDU, y resalta dónde está', () => {
    for (const paso of simular().pasos) {
      expect(paso.paquetes).toHaveLength(1);
      const p = paquete(paso);
      expect(p.pdu?.trim()).toBeTruthy();
      const { ubicacion } = p;
      expect(paso.resaltados).toEqual(
        ubicacion.tipo === 'nodo'
          ? { nodos: [ubicacion.nodo], enlaces: [] }
          : { nodos: [], enlaces: [ubicacion.enlace] },
      );
    }
  });

  it('el motor define la pila de cada equipo', () => {
    for (const nodo of simular().topologia.nodos) {
      expect(nodo.capas).toEqual(CAPAS_POR_TIPO[nodo.tipo as keyof typeof CAPAS_POR_TIPO]);
    }
  });
});

describe('encapsulamiento en el origen', () => {
  it('baja de la capa 7 a la 1 en A y después cruza el enlace', () => {
    expect(recorrido(simularTcpIp()).slice(0, 8)).toEqual([
      'a7',
      'a6',
      'a5',
      'a4',
      'a3',
      'a2',
      'a1',
      'a-b',
    ]);
  });

  it('TCP/IP: cada capa agrega exactamente su parte', () => {
    const pasos = simularTcpIp().pasos.slice(0, 7).map(paquete);
    expect(pasos.map(nombres)).toEqual([
      [],
      [],
      [],
      ['TCP'],
      ['IPv4', 'TCP'],
      ['Ethernet', 'FCS', 'IPv4', 'TCP'],
      ['Ethernet', 'FCS', 'IPv4', 'TCP'],
    ]);
    expect(pasos.map((p) => p.pdu)).toEqual([
      'Datos de la aplicación',
      'Datos de la aplicación',
      'Datos de la aplicación',
      'Segmento TCP',
      'Datagrama IP',
      'Trama',
      'Bits',
    ]);
    expect(pasos.map((p) => longitudTotal(p))).toEqual([37, 37, 37, 57, 77, 95, 95]);
  });

  it('modelo OSI: cada capa agrega su encabezado y la capa 2 también LT', () => {
    const pasos = simularModeloOsi().pasos.slice(0, 7).map(paquete);
    expect(pasos.map(nombres)).toEqual([
      ['AH'],
      ['PH', 'AH'],
      ['SH', 'PH', 'AH'],
      ['TH', 'SH', 'PH', 'AH'],
      ['NH', 'TH', 'SH', 'PH', 'AH'],
      ['LH', 'LT', 'NH', 'TH', 'SH', 'PH', 'AH'],
      ['LH', 'LT', 'NH', 'TH', 'SH', 'PH', 'AH'],
    ]);
    expect(pasos.map((p) => p.pdu)).toEqual([
      'A-PDU',
      'P-PDU',
      'S-PDU',
      'T-PDU',
      'N-PDU',
      'DL-PDU',
      'Bits',
    ]);
    for (const p of pasos) expect(longitudTotal(p)).toBeUndefined();
  });

  it('cada paso del origen explica qué agregó y cómo se llama la PDU', () => {
    const textos = simularTcpIp().pasos.map((p) => p.explicacion);
    expect(textos[3]).toMatch(/A, capa 4 \(Transporte\): TCP agrega su encabezado de 20 bytes/);
    expect(textos[3]).toMatch(/Ahora la PDU se llama «Segmento TCP» y mide 57 bytes\./);
    expect(textos[5]).toMatch(/FCS, de 4 bytes/);
    expect(textos[5]).toMatch(/«Trama» y mide 95 bytes/);
    expect(textos[1]).toMatch(/[Nn]o se agrega ningún encabezado/);
    expect(textos[1]).toMatch(/La PDU sigue siendo «Datos de la aplicación»/);
    expect(simularModeloOsi().pasos[3]?.explicacion).toMatch(
      /agrega TH.*Ahora la PDU se llama «T-PDU»\.$/,
    );
  });

  it('el primer paso dice qué escenario es: ejemplo o modelo', () => {
    expect(simularTcpIp().pasos[0]?.explicacion).toMatch(/^\[Ejemplo\]/);
    expect(simularModeloOsi().pasos[0]?.explicacion).toMatch(/no un protocolo real/);
  });

  it('la trama TCP/IP mide al menos 64 bytes y en el cable va Ethernet, IPv4, TCP, datos, FCS', () => {
    const trama = paquete(simularTcpIp().pasos[5]);
    expect(longitudTotal(trama)).toBeGreaterThanOrEqual(BYTES_TRAMA_MINIMA);
    expect(
      partesEnElCable(trama).map((p) => (p.tipo === 'datos' ? 'datos' : p.encabezado.nombre)),
    ).toEqual(['Ethernet', 'IPv4', 'TCP', 'datos', 'FCS']);
  });

  it('las direcciones son de los bloques para documentación', () => {
    for (const host of [HOST_A, HOST_B, HOST_B_OTRA_RED]) {
      expect(host.ipv4).toMatch(/^(192\.0\.2|198\.51\.100)\.\d{1,3}$/);
      expect(host.mac).toMatch(/^00-00-5E-00-53-[0-9A-F]{2}$/);
    }
    for (const mac of Object.values(ROUTER_R.macs ?? {})) {
      expect(mac).toMatch(/^00-00-5E-00-53-[0-9A-F]{2}$/);
    }
  });
});

describe('desencapsulamiento en el destino', () => {
  it('sube de la capa 1 a la 7 en B', () => {
    expect(recorrido(simularTcpIp()).slice(7)).toEqual([
      'a-b',
      'b1',
      'b2',
      'b3',
      'b4',
      'b5',
      'b6',
      'b7',
    ]);
  });

  it('en cada capa, B ve la misma PDU que armó su capa par en A', () => {
    for (const simular of [simularTcpIp, simularModeloOsi]) {
      const timeline = simular();
      const enA = new Map(pasosEn(timeline, 'a').map((p) => [capaDe(p), paquete(p)]));
      for (const paso of pasosEn(timeline, 'b')) {
        const { encabezados, pdu, datos } = paquete(paso);
        expect({ encabezados, pdu, datos }).toEqual({
          encabezados: enA.get(capaDe(paso))?.encabezados,
          pdu: enA.get(capaDe(paso))?.pdu,
          datos: enA.get(capaDe(paso))?.datos,
        });
      }
    }
  });

  it('las partes se quitan en orden inverso al que se agregaron', () => {
    const quitadas = (simular: () => Timeline) => {
      const enB = pasosEn(simular(), 'b').map(paquete);
      return enB.slice(1).flatMap((p, i) => {
        const antes = enB[i]?.encabezados ?? [];
        return antes.slice(0, antes.length - p.encabezados.length).map((e) => e.nombre);
      });
    };
    expect(quitadas(simularTcpIp)).toEqual(['Ethernet', 'FCS', 'IPv4', 'TCP']);
    expect(quitadas(simularModeloOsi)).toEqual(['LH', 'LT', 'NH', 'TH', 'SH', 'PH']);
    const ultimo = paquete(simularModeloOsi().pasos.at(-1));
    expect(nombres(ultimo)).toEqual(['AH']);
  });

  it('entrega a cada capa según su campo: 0x0800 → IPv4, 6 → TCP, 80 → aplicación', () => {
    const [b2, b3, b4] = pasosEn(simularTcpIp(), 'b').slice(1, 4);
    expect(b2?.explicacion).toMatch(/El campo EtherType vale 0x0800: el contenido es para IPv4\./);
    expect(campo(paquete(b2), 'Ethernet', 'EtherType')).toBe('0x0800');
    expect(b3?.explicacion).toMatch(/El campo Protocolo vale 6: el contenido es para TCP\./);
    expect(campo(paquete(b3), 'IPv4', 'Protocolo')).toBe('6');
    expect(b4?.explicacion).toMatch(/El campo Puerto destino vale 80: .*servidor web/);
    expect(campo(paquete(b4), 'TCP', 'Puerto destino')).toBe('80');
    expect(b2?.explicacion).toMatch(
      /Quita el encabezado Ethernet y la cola FCS y le pasa a la capa 3 lo que queda: «Datagrama IP»\./,
    );
  });

  it('al final, la aplicación de B recibe el mismo mensaje que envió A', () => {
    const timeline = simularTcpIp();
    const primero = paquete(timeline.pasos[0]);
    const ultimo = paquete(timeline.pasos.at(-1));
    expect(ultimo.ubicacion).toEqual({ tipo: 'nodo', nodo: 'b', capa: 7 });
    expect(ultimo.encabezados).toEqual([]);
    expect(ultimo.datos).toEqual(primero.datos);
    expect(ultimo.datos?.descripcion).toMatch(/^\[Ejemplo\] Pedido HTTP/);
    expect(timeline.pasos.at(-1)?.explicacion).toMatch(
      /B recibe los mismos datos que envió A: «\[Ejemplo\] Pedido HTTP/,
    );
  });
});

describe('equipos intermedios', () => {
  const hub: Intermedio = { id: 'h', etiqueta: 'H', tipo: 'hub' };
  const sw: Intermedio = { id: 's', etiqueta: 'S', tipo: 'switch' };

  it('el hub solo repite bits: no mira la trama', () => {
    const timeline = simularEncapsulamiento(PILA_TCPIP, {
      origen: HOST_A,
      intermedios: [hub],
      destino: HOST_B,
    });
    expect(validarTimeline(timeline)).toEqual([]);
    const enHub = pasosEn(timeline, 'h');
    expect(enHub.map(capaDe)).toEqual([1]);
    expect(paquete(enHub[0]).pdu).toBe('Bits');
    expect(enHub[0]?.explicacion).toMatch(/No arma la trama ni mira su contenido/);
    expect(recorrido(timeline)).toContain('h-b');
  });

  it('el switch sube a la capa 2 y reenvía la trama sin cambiarla', () => {
    const timeline = simularEncapsulamiento(PILA_TCPIP, {
      origen: HOST_A,
      intermedios: [sw],
      destino: HOST_B,
    });
    expect(validarTimeline(timeline)).toEqual([]);
    const tramaEnA = paquete(pasosEn(timeline, 'a').find((p) => capaDe(p) === 2)).encabezados;
    const enSwitch = pasosEn(timeline, 's');
    expect(enSwitch.map(capaDe)).toEqual([1, 2, 1]);
    for (const paso of enSwitch) expect(paquete(paso).encabezados).toEqual(tramaEnA);
    expect(enSwitch[1]?.explicacion).toMatch(/la trama sale igual que llegó/);
    // La trama va de A a B: el switch no aparece en las direcciones.
    expect(campo(paquete(enSwitch[1]), 'Ethernet', 'MAC destino')).toBe(HOST_B.mac);
  });

  it('el router sube a la capa 3, cambia las MAC y no el datagrama', () => {
    const timeline = simularRouterEnElMedio();
    expect(recorrido(timeline).slice(7, 14)).toEqual(['a-r', 'r1', 'r2', 'r3', 'r2', 'r1', 'r-b']);
    const enR = pasosEn(timeline, 'r').map(paquete);
    const [entrada, , enCapa3, salida] = enR;
    if (entrada === undefined || enCapa3 === undefined || salida === undefined) {
      throw new Error('faltan pasos en el router');
    }
    expect(nombres(enCapa3)).toEqual(['IPv4', 'TCP']);

    expect(campo(entrada, 'Ethernet', 'MAC origen')).toBe(HOST_A.mac);
    expect(campo(entrada, 'Ethernet', 'MAC destino')).toBe(ROUTER_R.macs?.haciaOrigen);
    expect(campo(salida, 'Ethernet', 'MAC origen')).toBe(ROUTER_R.macs?.haciaDestino);
    expect(campo(salida, 'Ethernet', 'MAC destino')).toBe(HOST_B_OTRA_RED.mac);

    const datagrama = (p: Paquete) => p.encabezados.filter((e) => e.capa >= 3);
    expect(datagrama(salida)).toEqual(datagrama(entrada));
    expect(campo(salida, 'IPv4', 'IP destino')).toBe('198.51.100.11');
    // B recibe la trama que armó el router, no la que armó A.
    const enB2 = paquete(pasosEn(timeline, 'b').find((p) => capaDe(p) === 2));
    expect(enB2.encabezados).toEqual(salida.encabezados);
  });

  it('A le manda la trama al router porque B está en otra red', () => {
    const a2 = pasosEn(simularRouterEnElMedio(), 'a').find((p) => capaDe(p) === 2);
    expect(a2?.explicacion).toMatch(/la del router R, porque B está en otra red/);
  });

  it('un switch y un router en el mismo recorrido', () => {
    const timeline = simularEncapsulamiento(PILA_TCPIP, {
      origen: HOST_A,
      intermedios: [sw, ROUTER_R],
      destino: HOST_B_OTRA_RED,
    });
    expect(validarTimeline(timeline)).toEqual([]);
    // El switch está en el salto de A al router: la trama va dirigida al router.
    const enSwitch = paquete(pasosEn(timeline, 's')[1]);
    expect(campo(enSwitch, 'Ethernet', 'MAC destino')).toBe(ROUTER_R.macs?.haciaOrigen);
  });
});

describe('error en un enlace', () => {
  it('B descarta la trama en la capa 2 y no hay pasos en sus capas 3 a 7', () => {
    const timeline = simularTramaConError();
    expect(recorrido(timeline).slice(6)).toEqual(['a1', 'a-b', 'b1', 'b2']);
    const ultimo = timeline.pasos.at(-1);
    expect(ultimo?.explicacion).toMatch(/FCS.*no coincide.*se descarta/);
    expect(ultimo?.explicacion).toMatch(/Ninguna capa de arriba de B la ve/);
    const enlace = timeline.pasos.find((p) => paquete(p).ubicacion.tipo === 'enlace');
    expect(enlace?.explicacion).toMatch(/\[Ejemplo\].*interferencia/);
  });

  it('el hub no detecta el error: lo detecta el siguiente equipo con capa 2', () => {
    const timeline = simularEncapsulamiento(PILA_TCPIP, {
      origen: HOST_A,
      intermedios: [{ id: 'h', etiqueta: 'H', tipo: 'hub' }],
      destino: HOST_B,
      enlaceConError: 0,
    });
    expect(recorrido(timeline).slice(7)).toEqual(['a-h', 'h1', 'h-b', 'b1', 'b2']);
  });

  it('con un router, un error en el segundo enlace lo detecta B y no R', () => {
    const timeline = simularEncapsulamiento(PILA_TCPIP, {
      origen: HOST_A,
      intermedios: [ROUTER_R],
      destino: HOST_B_OTRA_RED,
      enlaceConError: 1,
    });
    expect(validarTimeline(timeline)).toEqual([]);
    expect(recorrido(timeline).slice(-3)).toEqual(['r-b', 'b1', 'b2']);
  });

  it('en el modelo OSI, el descarte lo explica la cola LT', () => {
    const timeline = simularEncapsulamiento(PILA_OSI, {
      origen: HOST_A,
      destino: HOST_B,
      enlaceConError: 0,
    });
    expect(timeline.pasos.at(-1)?.explicacion).toMatch(/LT.*no coincide.*se descarta/);
  });

  it.each([-1, 1, 0.5, Number.NaN])('rechaza un enlace con error inexistente (%s)', (indice) => {
    expect(() =>
      simularEncapsulamiento(PILA_TCPIP, {
        origen: HOST_A,
        destino: HOST_B,
        enlaceConError: indice,
      }),
    ).toThrow(RangeError);
  });
});

describe('datos que faltan', () => {
  it('la pila TCP/IP avisa si el router no tiene MAC', () => {
    expect(() =>
      simularEncapsulamiento(PILA_TCPIP, {
        origen: HOST_A,
        intermedios: [{ id: 'r', etiqueta: 'R', tipo: 'router' }],
        destino: HOST_B_OTRA_RED,
      }),
    ).toThrow(/MAC de R/);
  });

  it('el modelo OSI no necesita direcciones', () => {
    const timeline = simularEncapsulamiento(PILA_OSI, {
      origen: { id: 'x', etiqueta: 'X' },
      intermedios: [{ id: 'r', etiqueta: 'R', tipo: 'router' }],
      destino: { id: 'y', etiqueta: 'Y' },
    });
    expect(validarTimeline(timeline)).toEqual([]);
    expect(timeline.pasos).toHaveLength(21);
  });
});
