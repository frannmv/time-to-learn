import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Encabezado, Timeline, Topologia } from '../../engine/core/timeline';
import { simularDemo } from '../../engine/demo/escenario';
import { leerTokens } from '../../styles/leer-tokens';
import {
  MEDIDAS,
  calcularCaja,
  claveUbicacion,
  duracionEnMs,
  esAvanceDeUnPaso,
  lineasEncabezado,
  posicionPaquete,
  posicionesNodos,
  tamanoPaquete,
} from './geometria';

const tokens = leerTokens(
  readFileSync(new URL('../../styles/tokens.css', import.meta.url), 'utf8'),
);

/** Tamaño del texto en px, suponiendo el tamaño raíz por omisión de los navegadores. */
const pxDeRem = (valor: string | undefined) => Number.parseFloat(valor ?? '') * 16;

const ipv4: Encabezado = { capa: 3, nombre: 'IPv4', campos: [] };
const ethernet: Encabezado = { capa: 2, nombre: 'Ethernet II', campos: [] };

const topologia: Topologia = {
  nodos: [
    { id: 'a', tipo: 'host', etiqueta: 'A', posicion: { x: 0, y: 0 } },
    { id: 'b', tipo: 'switch', etiqueta: 'B', posicion: { x: 100, y: 60 } },
  ],
  enlaces: [{ id: 'a-b', extremos: ['a', 'b'] }],
};
const nodos = posicionesNodos({ topologia, pasos: [] });

describe('MEDIDAS', () => {
  it('usa los mismos tamaños de texto que los tokens', () => {
    expect(pxDeRem(tokens.claro.get('--texto-sm'))).toBe(MEDIDAS.textoEtiqueta);
    expect(pxDeRem(tokens.claro.get('--texto-xs'))).toBe(MEDIDAS.textoChico);
  });

  it('deja el paquete por encima del anillo de un nodo resaltado', () => {
    expect(MEDIDAS.separacionPaquete).toBeGreaterThan(MEDIDAS.radioAnillo);
    expect(MEDIDAS.radioAnillo).toBeGreaterThan(MEDIDAS.radioNodo);
  });
});

describe('lineasEncabezado', () => {
  it('muestra el nombre del encabezado y el número y nombre de su capa', () => {
    expect(lineasEncabezado(ipv4)).toEqual(['IPv4', 'Capa 3 · Red']);
  });
});

describe('tamanoPaquete', () => {
  it('apila una fila por encabezado y ajusta el ancho a la línea más larga', () => {
    const { ancho, alto } = tamanoPaquete([ethernet, ipv4]);
    expect(alto).toBe(2 * MEDIDAS.altoFila);
    // La línea más larga es «Capa 2 · Enlace de datos» (24 caracteres).
    const texto = 24 * MEDIDAS.textoChico * MEDIDAS.caracterMono;
    expect(ancho).toBe(Math.ceil(MEDIDAS.franja + 2 * MEDIDAS.relleno + texto));
  });

  it('sin encabezados ocupa una fila', () => {
    expect(tamanoPaquete([]).alto).toBe(MEDIDAS.altoFila);
  });
});

describe('posicionPaquete', () => {
  it('en un nodo, se apoya arriba del nodo', () => {
    expect(posicionPaquete({ tipo: 'nodo', nodo: 'b' }, nodos)).toEqual({
      x: 100,
      y: 60 - MEDIDAS.separacionPaquete,
    });
  });

  it('en un enlace, se apoya arriba de su punto medio, en cualquier sentido', () => {
    const esperado = { x: 50, y: 30 - MEDIDAS.separacionPaquete };
    expect(
      posicionPaquete({ tipo: 'enlace', enlace: 'a-b', desde: 'a', hacia: 'b' }, nodos),
    ).toEqual(esperado);
    expect(
      posicionPaquete({ tipo: 'enlace', enlace: 'a-b', desde: 'b', hacia: 'a' }, nodos),
    ).toEqual(esperado);
  });

  it('falla si el nodo no existe', () => {
    expect(() => posicionPaquete({ tipo: 'nodo', nodo: 'z' }, nodos)).toThrow(/«z»/);
  });
});

describe('claveUbicacion', () => {
  it('distingue nodos y enlaces', () => {
    expect(claveUbicacion({ tipo: 'nodo', nodo: 'a' })).toBe('nodo:a');
    expect(claveUbicacion({ tipo: 'enlace', enlace: 'a-b', desde: 'b', hacia: 'a' })).toBe(
      'enlace:a-b',
    );
  });
});

describe('calcularCaja', () => {
  const contiene = (
    caja: { x: number; y: number; ancho: number; alto: number },
    x: number,
    y: number,
  ) => x >= caja.x && x <= caja.x + caja.ancho && y >= caja.y && y <= caja.y + caja.alto;

  it('incluye los nodos, sus etiquetas y el margen', () => {
    const caja = calcularCaja({ topologia, pasos: [] });
    expect(contiene(caja, -MEDIDAS.radioAnillo - MEDIDAS.margen, -MEDIDAS.radioAnillo)).toBe(true);
    expect(contiene(caja, 100, 60 + MEDIDAS.baseTipo + MEDIDAS.margen)).toBe(true);
  });

  it('incluye el paquete en todas las ubicaciones de todos los pasos', () => {
    const timeline = simularDemo();
    const caja = calcularCaja(timeline);
    const todos = posicionesNodos(timeline);
    for (const paso of timeline.pasos) {
      for (const paquete of paso.paquetes) {
        const { x, y } = posicionPaquete(paquete.ubicacion, todos);
        const { ancho, alto } = tamanoPaquete(paquete.encabezados);
        expect(contiene(caja, x - ancho / 2, y - alto)).toBe(true);
        expect(contiene(caja, x + ancho / 2, y)).toBe(true);
      }
    }
  });

  it('usa coordenadas enteras y es la misma en cada llamada', () => {
    const timeline: Timeline = simularDemo();
    const caja = calcularCaja(timeline);
    for (const valor of Object.values(caja)) expect(Number.isInteger(valor)).toBe(true);
    expect(calcularCaja(timeline)).toEqual(caja);
  });

  it('una topología vacía da una caja vacía', () => {
    expect(calcularCaja({ topologia: { nodos: [], enlaces: [] }, pasos: [] })).toEqual({
      x: 0,
      y: 0,
      ancho: 0,
      alto: 0,
    });
  });
});

describe('esAvanceDeUnPaso', () => {
  it('solo es verdadero al avanzar exactamente un paso', () => {
    expect(esAvanceDeUnPaso(0, 1)).toBe(true);
    expect(esAvanceDeUnPaso(3, 4)).toBe(true);
    expect(esAvanceDeUnPaso(1, 0)).toBe(false); // retroceder
    expect(esAvanceDeUnPaso(4, 0)).toBe(false); // reiniciar
    expect(esAvanceDeUnPaso(0, 2)).toBe(false); // saltar
    expect(esAvanceDeUnPaso(2, 2)).toBe(false);
    expect(esAvanceDeUnPaso(null, 0)).toBe(false); // primer dibujo
  });
});

describe('duracionEnMs', () => {
  it('lee milisegundos y segundos', () => {
    expect(duracionEnMs('600ms')).toBe(600);
    expect(duracionEnMs(' 0.3s ')).toBe(300);
    expect(duracionEnMs('0ms')).toBe(0);
  });

  it('lo que no es una duración vale 0', () => {
    expect(duracionEnMs('')).toBe(0);
    expect(duracionEnMs('rápido')).toBe(0);
    expect(duracionEnMs('-5ms')).toBe(0);
  });

  it('las duraciones de los tokens se pueden leer', () => {
    expect(duracionEnMs(tokens.claro.get('--duracion-lenta') ?? '')).toBeGreaterThan(0);
    expect(duracionEnMs(tokens.movimientoReducido.get('--duracion-lenta') ?? '')).toBe(0);
  });
});
