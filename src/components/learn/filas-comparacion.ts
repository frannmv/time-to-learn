/**
 * Cómo se dibuja la tabla comparativa de modelos (`ModelComparison.astro`): qué filas tiene,
 * qué celdas empiezan en cada una y cuántas filas abarca cada celda.
 *
 * No define capas, nombres ni PDU: los toma de `src/engine/osi/modelos.ts` y solo decide la
 * forma de la tabla. Una fila por capa OSI, de la 7 a la 1; si se muestra la columna IEEE 802,
 * la capa 2 ocupa una fila por subcapa (LLC arriba, MAC abajo). Las celdas seguidas que
 * dicen lo mismo se unen en una sola, con `rowspan`.
 */
import { CAPAS, type Capa } from '../../engine/core/capas';
import {
  MODELO_IEEE802,
  MODELO_TCPIP,
  PDU_OSI,
  PDU_TCPIP,
  capaDelModelo,
  type Subcapa,
} from '../../engine/osi/modelos';

/** Columnas opcionales de la tabla. La de las capas OSI está siempre. */
export type ColumnaComparacion = 'pdu-osi' | 'tcpip' | 'pdu-tcpip' | 'ieee802';

/** Todas las columnas opcionales, en el orden en que se dibujan. */
export const COLUMNAS_COMPARACION: readonly ColumnaComparacion[] = [
  'pdu-osi',
  'tcpip',
  'pdu-tcpip',
  'ieee802',
];

export interface EncabezadoColumna {
  readonly texto: string;
  /** Aclaración que se muestra debajo del texto. */
  readonly aclaracion?: string;
}

/** Encabezados de columna. `osi` es la columna de las capas OSI (los encabezados de fila). */
export const ENCABEZADOS: Readonly<Record<'osi' | ColumnaComparacion, EncabezadoColumna>> = {
  osi: { texto: 'Capa OSI' },
  'pdu-osi': { texto: 'PDU en OSI' },
  tcpip: { texto: 'Capa TCP/IP' },
  // Los nombres de PDU_TCPIP son los de TCP sobre IPv4 sobre Ethernet (ver modelos.ts).
  'pdu-tcpip': { texto: 'PDU en TCP/IP', aclaracion: 'con TCP, IPv4 y Ethernet' },
  ieee802: { texto: 'IEEE 802' },
};

/** Una celda de datos, en la fila donde empieza. */
export interface CeldaComparacion {
  readonly columna: ColumnaComparacion;
  readonly texto: string;
  /** Texto secundario: el nombre completo de una subcapa u otro nombre de la capa. */
  readonly detalle?: string;
  /** Cuántas filas abarca (`rowspan`). */
  readonly filas: number;
  /** Capas OSI que cubre, de abajo hacia arriba. */
  readonly capas: readonly Capa[];
  /** La capa OSI queda fuera de lo que describe el modelo de la columna. */
  readonly fueraDeAlcance?: boolean;
}

/** Una fila de la tabla. */
export interface FilaComparacion {
  readonly capa: Capa;
  /** Subcapa de IEEE 802 que ocupa la fila, cuando la capa 2 se parte en dos. */
  readonly subcapa?: Subcapa;
  /**
   * Filas que abarca el encabezado de la capa OSI. Solo está en la primera fila de cada capa:
   * en la segunda fila de la capa 2, el encabezado ya está dibujado arriba.
   */
  readonly encabezado?: { readonly filas: number };
  /** Celdas que empiezan en esta fila, en el orden de las columnas. */
  readonly celdas: readonly CeldaComparacion[];
}

export interface TablaComparacion {
  /** Columnas pedidas, sin repetir y en el orden en que se dibujan. */
  readonly columnas: readonly ColumnaComparacion[];
  /** Filas, de la capa 7 a la 1. */
  readonly filas: readonly FilaComparacion[];
}

/** Una fila antes de unir celdas: una capa OSI y, en la capa 2, quizá una subcapa. */
interface Ranura {
  readonly capa: Capa;
  readonly subcapa?: Subcapa;
}

/** Contenido de una columna en una ranura. Las ranuras seguidas con la misma clave se unen. */
interface Contenido {
  readonly clave: string;
  readonly texto: string;
  readonly detalle?: string;
  readonly fueraDeAlcance?: boolean;
}

function contenido(columna: ColumnaComparacion, { capa, subcapa }: Ranura): Contenido {
  switch (columna) {
    case 'pdu-osi':
      return { clave: `pdu-osi-${capa}`, texto: PDU_OSI[capa] };
    case 'pdu-tcpip':
      // En las capas 5 a 7 la PDU es la misma: los datos de la aplicación.
      return { clave: `pdu-tcpip-${PDU_TCPIP[capa]}`, texto: PDU_TCPIP[capa] };
    case 'tcpip': {
      const capaTcpip = capaDelModelo(MODELO_TCPIP, capa);
      if (capaTcpip === undefined) return fueraDeAlcance(columna);
      return {
        clave: capaTcpip.id,
        texto: capaTcpip.nombre,
        detalle: capaTcpip.otrosNombres?.length
          ? `También: ${capaTcpip.otrosNombres.join(', ')}`
          : undefined,
      };
    }
    case 'ieee802': {
      const capaIeee = capaDelModelo(MODELO_IEEE802, capa);
      if (capaIeee === undefined) return fueraDeAlcance(columna);
      if (subcapa !== undefined) {
        return { clave: subcapa.id, texto: subcapa.sigla, detalle: subcapa.nombre };
      }
      return { clave: capaIeee.id, texto: capaIeee.nombre };
    }
  }
}

function fueraDeAlcance(columna: ColumnaComparacion): Contenido {
  return { clave: `${columna}-fuera`, texto: 'Fuera de su alcance', fueraDeAlcance: true };
}

/** Ranuras de la tabla, de arriba abajo. */
function ranuras(conSubcapas: boolean): Ranura[] {
  return [...CAPAS].reverse().flatMap((capa): Ranura[] => {
    const subcapas = conSubcapas ? capaDelModelo(MODELO_IEEE802, capa)?.subcapas : undefined;
    if (subcapas === undefined || subcapas.length === 0) return [{ capa }];
    // Las subcapas están de abajo hacia arriba; la tabla va de arriba abajo.
    return [...subcapas].reverse().map((subcapa) => ({ capa, subcapa }));
  });
}

/** Arma la tabla con las columnas pedidas (por defecto, todas). */
export function tablaComparacion(
  pedidas: readonly ColumnaComparacion[] = COLUMNAS_COMPARACION,
): TablaComparacion {
  const columnas = COLUMNAS_COMPARACION.filter((c) => pedidas.includes(c));
  const lista = ranuras(columnas.includes('ieee802'));
  const contenidos = lista.map((ranura) => columnas.map((c) => contenido(c, ranura)));

  const filas = lista.map((ranura, i): FilaComparacion => {
    const primeraDeLaCapa = lista[i - 1]?.capa !== ranura.capa;
    const celdas: CeldaComparacion[] = [];
    contenidos[i]?.forEach((actual, j) => {
      const columna = columnas[j];
      // La celda ya empezó en una fila de arriba.
      if (columna === undefined || contenidos[i - 1]?.[j]?.clave === actual.clave) return;
      let fin = i;
      while (contenidos[fin + 1]?.[j]?.clave === actual.clave) fin++;
      const capas = [...new Set(lista.slice(i, fin + 1).map((r) => r.capa))].sort((a, b) => a - b);
      celdas.push({
        columna,
        texto: actual.texto,
        detalle: actual.detalle,
        filas: fin - i + 1,
        capas,
        fueraDeAlcance: actual.fueraDeAlcance,
      });
    });
    return {
      capa: ranura.capa,
      subcapa: ranura.subcapa,
      encabezado: primeraDeLaCapa
        ? { filas: lista.filter((r) => r.capa === ranura.capa).length }
        : undefined,
      celdas,
    };
  });

  return { columnas, filas };
}

/**
 * Capas OSI en texto, para leer una celda fuera de su fila: «capa OSI 2», «capas OSI 1 y 2»,
 * «capas OSI 5 a 7».
 */
export function textoCapas(capas: readonly Capa[]): string {
  const ordenadas = [...capas].sort((a, b) => a - b);
  const [primera] = ordenadas;
  const ultima = ordenadas.at(-1);
  if (primera === undefined || ultima === undefined) return '';
  if (ordenadas.length === 1) return `capa OSI ${primera}`;
  if (ordenadas.length === 2) return `capas OSI ${primera} y ${ultima}`;
  const seguidas = ultima - primera === ordenadas.length - 1;
  if (seguidas) return `capas OSI ${primera} a ${ultima}`;
  return `capas OSI ${ordenadas.slice(0, -1).join(', ')} y ${ultima}`;
}

/** Título por defecto según los modelos que aparecen en las columnas. */
export function tituloComparacion(columnas: readonly ColumnaComparacion[]): string {
  const modelos = ['OSI'];
  if (columnas.includes('tcpip') || columnas.includes('pdu-tcpip')) modelos.push('TCP/IP');
  if (columnas.includes('ieee802')) modelos.push('IEEE 802');
  if (modelos.length === 1) return 'Capas del modelo OSI';
  const ultimo = modelos.pop();
  const conjuncion = ultimo?.startsWith('I') ? 'e' : 'y';
  return `Comparación de los modelos ${modelos.join(', ')} ${conjuncion} ${ultimo}`;
}
