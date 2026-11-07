/**
 * Geometría de la vista de pila de protocolos: una columna por nodo con sus capas, y el
 * medio físico que une las columnas según los enlaces de la topología.
 *
 * Son cuentas de dibujo, no lógica de protocolo: qué capas tiene cada equipo lo dice el
 * escenario (`Nodo.capas`) y dónde está la PDU lo dice el `Step`. Las unidades son las del
 * `viewBox`; a escala 1, una unidad mide un píxel CSS (los tamaños de texto coinciden con
 * los tokens, lo verifica geometria-pila.test.ts).
 *
 * - Las columnas siguen el orden de las posiciones de los nodos (primero x, después y).
 * - Las filas se alinean por número de capa: la capa 3 de un router queda a la altura de la
 *   capa 3 de un host. La capa más alta va arriba, como en el modelo OSI.
 * - El medio físico corre debajo de la capa 1. Un enlace entre columnas vecinas es un tramo
 *   recto; uno entre columnas que no son vecinas baja a un nivel propio para no pasar por
 *   debajo de las columnas del medio sin distinguirse.
 */
import { NOMBRE_CAPA, type Capa } from '../../engine/core/capas';
import type { Enlace, Nodo, Paquete, Timeline, Ubicacion } from '../../engine/core/timeline';
import type { Caja, Punto } from './geometria';

export const MEDIDAS_PILA = Object.freeze({
  /** Ancho de una columna (y de cada capa dentro de ella). */
  anchoColumna: 148,
  /** Espacio horizontal entre dos columnas. Deja lugar para la pestaña «PDU». */
  separacion: 52,
  /** Alto de una capa (dos líneas de texto) y espacio vertical entre dos capas. */
  altoCapa: 44,
  huecoCapa: 4,
  /** Líneas base de «Capa N» y del nombre de la capa, desde el borde superior de la capa. */
  baseNumero: 17,
  baseNombre: 35,
  /** Alto del rótulo de la columna (etiqueta y tipo del nodo) y sus líneas base. */
  altoRotulo: 44,
  baseEtiqueta: 18,
  baseTipo: 36,
  /** Distancia del borde inferior de la capa 1 al medio físico. */
  medio: 28,
  /** Profundidad de cada nivel extra del medio (enlaces entre columnas no vecinas). */
  nivelMedio: 28,
  /** Ficha de los bits en tránsito, sobre el medio. */
  altoFicha: 24,
  /** Pestaña con el texto «PDU» a la derecha de la capa actual. */
  anchoPestana: 44,
  altoPestana: 22,
  /** Ancho de la franja de color a la izquierda de cada capa. */
  franja: 4,
  /** Relleno horizontal del texto. */
  relleno: 8,
  /** Margen alrededor de todo el dibujo. */
  margen: 16,
  /** Tamaño del nombre de la capa y de la etiqueta del nodo. Igual a --texto-sm. */
  textoNombre: 14,
  /** Tamaño de «Capa N», del tipo de nodo y de las fichas. Igual a --texto-xs. */
  textoChico: 12,
  /**
   * Ancho estimado de un carácter de los nombres de capa, en em. Medido en la fuente del
   * sitio, «Enlace de datos» ocupa unos 0,46 em por carácter; 0,6 deja margen para las
   * fuentes de reemplazo y permite que tres columnas entren en la columna de lectura.
   */
  caracterNombre: 0.6,
  /** Ancho estimado de un carácter monoespaciado, en em (ver MEDIDAS en geometria.ts). */
  caracterMono: 0.62,
});

export interface CapaColumna {
  readonly capa: Capa;
  readonly caja: Caja;
}

export interface ColumnaPila {
  readonly nodo: Nodo;
  /** Centro horizontal de la columna: ahí baja la columna al medio físico. */
  readonly centro: number;
  /** Rótulo con la etiqueta y el tipo del nodo, arriba de su capa más alta. */
  readonly rotulo: Caja;
  /** Capas del nodo, de abajo hacia arriba, como en `Nodo.capas`. */
  readonly capas: readonly CapaColumna[];
  /** Borde inferior de la columna, de donde baja al medio. */
  readonly base: number;
}

export interface TramoMedio {
  readonly enlace: Enlace;
  /** 0 para columnas vecinas; 1, 2… para enlaces que saltan columnas. */
  readonly nivel: number;
  /** Puntos de la línea, de la columna de más a la izquierda a la otra. */
  readonly puntos: readonly Punto[];
  /** Centro del tramo horizontal: ahí van los bits en tránsito. */
  readonly centro: Punto;
}

export interface GeometriaPila {
  readonly columnas: readonly ColumnaPila[];
  readonly tramos: readonly TramoMedio[];
  /** Altura del medio físico (nivel 0). */
  readonly yMedio: number;
  readonly caja: Caja;
}

/** Texto de las dos líneas de una capa: «Capa 2» y «Enlace de datos». */
export function lineasCapa(capa: Capa): readonly [string, string] {
  return [`Capa ${capa}`, NOMBRE_CAPA[capa]];
}

/** Nodos en el orden de sus posiciones: de izquierda a derecha y, a igual x, de arriba abajo. */
export function ordenColumnas(nodos: readonly Nodo[]): Nodo[] {
  return [...nodos].sort((a, b) => a.posicion.x - b.posicion.x || a.posicion.y - b.posicion.y);
}

/**
 * Nivel del medio de cada enlace, según las columnas que une. Los enlaces entre vecinas van
 * en el nivel 0; los demás, en el primer nivel desde 1 donde no se superponen con otro.
 */
export function nivelesEnlaces(
  enlaces: readonly Enlace[],
  indice: ReadonlyMap<string, number>,
): Map<string, number> {
  const tramos = enlaces.flatMap((enlace) => {
    const [a, b] = enlace.extremos.map((id) => indice.get(id));
    if (a === undefined || b === undefined) return [];
    return [{ id: enlace.id, desde: Math.min(a, b), hasta: Math.max(a, b) }];
  });
  tramos.sort((x, y) => x.hasta - x.desde - (y.hasta - y.desde) || x.desde - y.desde);

  const ocupados: { desde: number; hasta: number; nivel: number }[] = [];
  const niveles = new Map<string, number>();
  for (const tramo of tramos) {
    let nivel = tramo.hasta - tramo.desde === 1 ? 0 : 1;
    while (
      ocupados.some((o) => o.nivel === nivel && o.desde < tramo.hasta && tramo.desde < o.hasta)
    ) {
      nivel++;
    }
    ocupados.push({ ...tramo, nivel });
    niveles.set(tramo.id, nivel);
  }
  return niveles;
}

/** Texto de la ficha de los bits en tránsito, con una flecha hacia donde van. */
export function textoFicha(paquete: Pick<Paquete, 'pdu' | 'ubicacion'>, geo: GeometriaPila) {
  const nombre = paquete.pdu ?? 'Bits';
  const { ubicacion } = paquete;
  if (ubicacion.tipo !== 'enlace') return nombre;
  const x = (id: string) => geo.columnas.find((c) => c.nodo.id === id)?.centro ?? 0;
  return x(ubicacion.hacia) < x(ubicacion.desde) ? `← ${nombre}` : `${nombre} →`;
}

const anchoTexto = (texto: string, tamano: number, caracter: number) =>
  texto.length * tamano * caracter;

/** Ancho de la ficha de los bits en tránsito. */
export function anchoFicha(texto: string): number {
  const { textoChico, caracterMono, relleno } = MEDIDAS_PILA;
  return Math.ceil(anchoTexto(texto, textoChico, caracterMono) + 2 * relleno);
}

/** Calcula columnas, tramos del medio y la caja de todo el dibujo en todos los pasos. */
export function geometriaPila(timeline: Timeline): GeometriaPila {
  const M = MEDIDAS_PILA;
  const nodos = ordenColumnas(timeline.topologia.nodos);
  const capaMax = Math.max(1, ...nodos.flatMap((n) => n.capas ?? []));
  const yCapa = (capa: number) =>
    M.margen + M.altoRotulo + (capaMax - capa) * (M.altoCapa + M.huecoCapa);
  const pieCapa1 = yCapa(1) + M.altoCapa;
  const yMedio = pieCapa1 + M.medio;

  const columnas: ColumnaPila[] = nodos.map((nodo, i) => {
    const x = M.margen + i * (M.anchoColumna + M.separacion);
    const capas = (nodo.capas ?? []).map((capa) => ({
      capa,
      caja: { x, y: yCapa(capa), ancho: M.anchoColumna, alto: M.altoCapa },
    }));
    const arriba = capas.at(-1);
    const abajo = capas[0];
    const yRotulo = arriba === undefined ? pieCapa1 - M.altoRotulo : arriba.caja.y - M.altoRotulo;
    return {
      nodo,
      centro: x + M.anchoColumna / 2,
      rotulo: { x, y: yRotulo, ancho: M.anchoColumna, alto: M.altoRotulo },
      capas,
      base: abajo === undefined ? yRotulo + M.altoRotulo : abajo.caja.y + abajo.caja.alto,
    };
  });

  const indice = new Map(columnas.map((c, i) => [c.nodo.id, i]));
  const niveles = nivelesEnlaces(timeline.topologia.enlaces, indice);
  const tramos: TramoMedio[] = timeline.topologia.enlaces.flatMap((enlace) => {
    const [a, b] = enlace.extremos
      .map((id) => columnas[indice.get(id) ?? -1])
      .sort((p, q) => (p?.centro ?? 0) - (q?.centro ?? 0));
    const nivel = niveles.get(enlace.id);
    if (a === undefined || b === undefined || nivel === undefined) return [];
    const y = yMedio + nivel * M.nivelMedio;
    const puntos =
      nivel === 0
        ? [
            { x: a.centro, y },
            { x: b.centro, y },
          ]
        : [
            { x: a.centro, y: yMedio },
            { x: a.centro, y },
            { x: b.centro, y },
            { x: b.centro, y: yMedio },
          ];
    return [{ enlace, nivel, puntos, centro: { x: (a.centro + b.centro) / 2, y } }];
  });

  const parcial: GeometriaPila = {
    columnas,
    tramos,
    yMedio,
    caja: { x: 0, y: 0, ancho: 0, alto: 0 },
  };
  return { ...parcial, caja: calcularCajaPila(timeline, parcial) };
}

/** Caja de un rectángulo centrado en un punto. */
const centrada = (p: Punto, ancho: number, alto: number): Caja => ({
  x: p.x - ancho / 2,
  y: p.y - alto / 2,
  ancho,
  alto,
});

export const centroDe = (caja: Caja): Punto => ({
  x: caja.x + caja.ancho / 2,
  y: caja.y + caja.alto / 2,
});

/**
 * Lo que marca dónde está la PDU: una capa, el rótulo del nodo (si el paso no dice la capa
 * o el nodo no declara su pila) o la ficha sobre el tramo del enlace. Devuelve `undefined`
 * si la ubicación no está en el dibujo.
 */
export function marcaUbicacion(
  paquete: Pick<Paquete, 'pdu' | 'ubicacion'>,
  geo: GeometriaPila,
): { readonly tipo: 'capa' | 'nodo' | 'enlace'; readonly caja: Caja } | undefined {
  const { ubicacion } = paquete;
  if (ubicacion.tipo === 'enlace') {
    const tramo = geo.tramos.find((t) => t.enlace.id === ubicacion.enlace);
    if (tramo === undefined) return undefined;
    const ancho = anchoFicha(textoFicha(paquete, geo));
    return { tipo: 'enlace', caja: centrada(tramo.centro, ancho, MEDIDAS_PILA.altoFicha) };
  }
  const columna = geo.columnas.find((c) => c.nodo.id === ubicacion.nodo);
  if (columna === undefined) return undefined;
  const capa = columna.capas.find((c) => c.capa === ubicacion.capa);
  return capa === undefined
    ? { tipo: 'nodo', caja: columna.rotulo }
    : { tipo: 'capa', caja: capa.caja };
}

/** Pestaña «PDU» pegada a la derecha de una capa o de un rótulo, centrada en alto. */
export function cajaPestana(marca: Caja): Caja {
  const { anchoPestana, altoPestana } = MEDIDAS_PILA;
  return {
    x: marca.x + marca.ancho,
    y: marca.y + (marca.alto - altoPestana) / 2,
    ancho: anchoPestana,
    alto: altoPestana,
  };
}

/** Clave legible de dónde está la PDU en la pila («a:3», «a», «enlace:a-b»). */
export function claveEnPila(ubicacion: Ubicacion): string {
  if (ubicacion.tipo === 'enlace') return `enlace:${ubicacion.enlace}`;
  return ubicacion.capa === undefined ? ubicacion.nodo : `${ubicacion.nodo}:${ubicacion.capa}`;
}

/**
 * Caja que contiene todo el dibujo en todos los pasos: columnas, medio, pestañas y fichas.
 * Es la misma para toda la línea de tiempo, así el diagrama no cambia de tamaño.
 */
function calcularCajaPila(timeline: Timeline, geo: GeometriaPila): Caja {
  const M = MEDIDAS_PILA;
  if (geo.columnas.length === 0) return { x: 0, y: 0, ancho: 0, alto: 0 };

  let maxX = -Infinity;
  let maxY = -Infinity;
  const incluir = (c: Caja) => {
    maxX = Math.max(maxX, c.x + c.ancho);
    maxY = Math.max(maxY, c.y + c.alto);
  };

  for (const columna of geo.columnas) {
    incluir(columna.rotulo);
    for (const { caja } of columna.capas) incluir(cajaPestana(caja));
    incluir(cajaPestana(columna.rotulo));
  }
  for (const tramo of geo.tramos) {
    for (const p of tramo.puntos) incluir({ x: p.x, y: p.y, ancho: 0, alto: 0 });
  }
  incluir({ x: 0, y: geo.yMedio, ancho: 0, alto: 0 });
  for (const paso of timeline.pasos) {
    for (const paquete of paso.paquetes) {
      const marca = marcaUbicacion(paquete, geo);
      if (marca !== undefined) incluir(marca.caja);
    }
  }

  // Arriba y a la izquierda, el dibujo empieza en el margen.
  return { x: 0, y: 0, ancho: Math.ceil(maxX + M.margen), alto: Math.ceil(maxY + M.margen) };
}
