/**
 * Geometría del diagrama de una simulación: dónde se dibuja cada cosa y qué tamaño ocupa.
 *
 * Son cuentas de dibujo, no lógica de protocolo: las posiciones de los nodos y la ubicación
 * de cada paquete vienen del escenario y de los pasos. Acá solo se convierten en
 * coordenadas del SVG. Las unidades son las del `viewBox`: a escala 1, una unidad mide un
 * píxel CSS, y por eso los tamaños de texto coinciden con los tokens (lo verifica
 * geometria.test.ts).
 */
import { NOMBRE_CAPA } from '../../engine/core/capas';
import type {
  Encabezado,
  Posicion,
  TipoNodo,
  Timeline,
  Ubicacion,
} from '../../engine/core/timeline';

export interface Punto {
  readonly x: number;
  readonly y: number;
}

/** Rectángulo en coordenadas del SVG, con (x, y) en la esquina superior izquierda. */
export interface Caja {
  readonly x: number;
  readonly y: number;
  readonly ancho: number;
  readonly alto: number;
}

export const MEDIDAS = Object.freeze({
  /** Mitad del lado del cuadrado que ocupa la forma de un nodo. */
  radioNodo: 24,
  /** Mitad del lado del anillo que marca un nodo resaltado. */
  radioAnillo: 32,
  /** Línea base de la etiqueta del nodo, medida desde su centro. */
  baseEtiqueta: 50,
  /** Línea base del nombre del tipo de nodo, medida desde su centro. */
  baseTipo: 66,
  /** Tamaño de la etiqueta del nodo. Igual a --texto-sm. */
  textoEtiqueta: 14,
  /** Tamaño del texto chico (tipo de nodo, encabezados del paquete). Igual a --texto-xs. */
  textoChico: 12,
  /** Distancia del centro del nodo (o del enlace) al borde inferior del paquete. */
  separacionPaquete: 40,
  /** Alto de un encabezado dentro del paquete (dos líneas de texto). */
  altoFila: 36,
  /** Líneas base de las dos líneas de un encabezado, desde su borde superior. */
  baseNombre: 15,
  baseCapa: 29,
  /** Ancho de la franja de color a la izquierda de cada encabezado. */
  franja: 4,
  /** Relleno horizontal del texto de un encabezado. */
  relleno: 8,
  /** Margen alrededor de todo el dibujo. */
  margen: 16,
  /**
   * Ancho estimado de un carácter, en em. El paquete usa fuente monoespaciada, así que el
   * ancho de su texto se puede estimar sin medir el DOM (las fuentes monoespaciadas de la
   * pila miden entre 0,55 y 0,6 em). Para el texto proporcional de las etiquetas se usa un
   * valor generoso.
   */
  caracterMono: 0.62,
  caracterTexto: 0.7,
});

/** Nombre visible de cada tipo de nodo. */
export const NOMBRE_TIPO: Readonly<Record<TipoNodo, string>> = Object.freeze({
  host: 'Host',
  switch: 'Switch',
  router: 'Router',
  hub: 'Hub',
  ap: 'Punto de acceso',
});

/** Texto de un encabezado del paquete: su nombre y el de su capa. */
export function lineasEncabezado(encabezado: Encabezado): readonly [string, string] {
  return [encabezado.nombre, `Capa ${encabezado.capa} · ${NOMBRE_CAPA[encabezado.capa]}`];
}

/** Texto de la fila que se dibuja cuando un paquete no tiene encabezados. */
export const TEXTO_SIN_ENCABEZADOS = 'Sin encabezados';

const anchoTexto = (texto: string, tamano: number, caracter: number) =>
  texto.length * tamano * caracter;

/** Tamaño de un paquete dibujado como pila de encabezados (siempre al menos una fila). */
export function tamanoPaquete(encabezados: readonly Encabezado[]): {
  readonly ancho: number;
  readonly alto: number;
} {
  const lineas =
    encabezados.length > 0 ? encabezados.flatMap(lineasEncabezado) : [TEXTO_SIN_ENCABEZADOS];
  const texto = Math.max(
    ...lineas.map((l) => anchoTexto(l, MEDIDAS.textoChico, MEDIDAS.caracterMono)),
  );
  return {
    ancho: Math.ceil(MEDIDAS.franja + 2 * MEDIDAS.relleno + texto),
    alto: Math.max(encabezados.length, 1) * MEDIDAS.altoFila,
  };
}

/**
 * Punto donde se apoya un paquete: el centro de su borde inferior. Va arriba del nodo, o
 * arriba del punto medio del enlace, para no tapar las formas ni las etiquetas.
 */
export function posicionPaquete(ubicacion: Ubicacion, nodos: ReadonlyMap<string, Posicion>): Punto {
  const posicion = (id: string): Posicion => {
    const p = nodos.get(id);
    if (p === undefined) throw new Error(`El nodo «${id}» no está en la topología.`);
    return p;
  };

  let centro: Punto;
  if (ubicacion.tipo === 'nodo') {
    centro = posicion(ubicacion.nodo);
  } else {
    const desde = posicion(ubicacion.desde);
    const hacia = posicion(ubicacion.hacia);
    centro = { x: (desde.x + hacia.x) / 2, y: (desde.y + hacia.y) / 2 };
  }
  return { x: centro.x, y: centro.y - MEDIDAS.separacionPaquete };
}

/** Clave legible de una ubicación («nodo:b», «enlace:a-b»), para atributos y tests. */
export function claveUbicacion(ubicacion: Ubicacion): string {
  return ubicacion.tipo === 'nodo' ? `nodo:${ubicacion.nodo}` : `enlace:${ubicacion.enlace}`;
}

/** Mapa de id de nodo a su posición. */
export function posicionesNodos(timeline: Timeline): ReadonlyMap<string, Posicion> {
  return new Map(timeline.topologia.nodos.map((n) => [n.id, n.posicion]));
}

/**
 * Caja que contiene todo el dibujo en todos los pasos: nodos con sus etiquetas y cada
 * paquete en cada ubicación por la que pasa. Es la misma para toda la línea de tiempo, así
 * el diagrama no cambia de tamaño al cambiar de paso.
 */
export function calcularCaja(timeline: Timeline): Caja {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const incluir = (x0: number, y0: number, x1: number, y1: number) => {
    minX = Math.min(minX, x0);
    minY = Math.min(minY, y0);
    maxX = Math.max(maxX, x1);
    maxY = Math.max(maxY, y1);
  };

  for (const nodo of timeline.topologia.nodos) {
    const { x, y } = nodo.posicion;
    const mitad = Math.max(
      MEDIDAS.radioAnillo,
      anchoTexto(nodo.etiqueta, MEDIDAS.textoEtiqueta, MEDIDAS.caracterTexto) / 2,
      anchoTexto(NOMBRE_TIPO[nodo.tipo], MEDIDAS.textoChico, MEDIDAS.caracterTexto) / 2,
    );
    // Debajo de la línea base del tipo quedan los descendentes del texto.
    incluir(x - mitad, y - MEDIDAS.radioAnillo, x + mitad, y + MEDIDAS.baseTipo + MEDIDAS.relleno);
  }

  const nodos = posicionesNodos(timeline);
  for (const paso of timeline.pasos) {
    for (const paquete of paso.paquetes) {
      const { x, y } = posicionPaquete(paquete.ubicacion, nodos);
      const { ancho, alto } = tamanoPaquete(paquete.encabezados);
      incluir(x - ancho / 2, y - alto, x + ancho / 2, y);
    }
  }

  if (!Number.isFinite(minX)) return { x: 0, y: 0, ancho: 0, alto: 0 };

  const x = Math.floor(minX - MEDIDAS.margen);
  const y = Math.floor(minY - MEDIDAS.margen);
  return {
    x,
    y,
    ancho: Math.ceil(maxX + MEDIDAS.margen) - x,
    alto: Math.ceil(maxY + MEDIDAS.margen) - y,
  };
}

// ---------------------------------------------------------------------------------------
// Movimiento
// ---------------------------------------------------------------------------------------

/**
 * El paquete se desplaza solo cuando se avanza exactamente un paso (con el botón, la
 * flecha o la reproducción). Al retroceder, reiniciar o saltar, cambia de lugar sin
 * desplazarse.
 */
export function esAvanceDeUnPaso(anterior: number | null, actual: number): boolean {
  return anterior !== null && actual === anterior + 1;
}

/** Convierte una duración CSS («600ms», «0.6s») a milisegundos. Lo inválido vale 0. */
export function duracionEnMs(texto: string): number {
  const coincidencia = /^\s*(\d*\.?\d+)\s*(ms|s)\s*$/i.exec(texto);
  if (coincidencia === null) return 0;
  const [, numero = '0', unidad = 'ms'] = coincidencia;
  const valor = Number.parseFloat(numero);
  return unidad.toLowerCase() === 's' ? valor * 1000 : valor;
}
