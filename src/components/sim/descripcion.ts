/**
 * Descripciones en texto del diagrama, para lectores de pantalla. Dicen lo mismo que el
 * dibujo, sin depender del color ni de las formas: qué nodos hay, cómo se conectan y dónde
 * está cada paquete. Solo leen la topología y el paso; no deciden nada.
 */
import { NOMBRE_CAPA } from '../../engine/core/capas';
import { partesEnElCable } from '../../engine/core/pdu';
import type { Nodo, Paquete, Step, Topologia } from '../../engine/core/timeline';
import { NOMBRE_TIPO } from './geometria';

/** Une una lista en español: «A», «A y B», «A, B y C». */
export function enumerar(partes: readonly string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`;
}

const cantidad = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;

/** «3 nodos: A (host), B (router) y C (host). 2 enlaces: A con B y B con C.» */
export function describirTopologia(topologia: Topologia): string {
  const etiqueta = new Map(topologia.nodos.map((n) => [n.id, n.etiqueta]));
  const nodos = topologia.nodos.map((n) => `${n.etiqueta} (${NOMBRE_TIPO[n.tipo].toLowerCase()})`);
  const enlaces = topologia.enlaces.map(
    ({ extremos: [a, b] }) => `${etiqueta.get(a) ?? a} con ${etiqueta.get(b) ?? b}`,
  );

  const frases = [
    nodos.length > 0
      ? `${cantidad(nodos.length, 'nodo', 'nodos')}: ${enumerar(nodos)}.`
      : 'Sin nodos.',
    enlaces.length > 0
      ? `${cantidad(enlaces.length, 'enlace', 'enlaces')}: ${enumerar(enlaces)}.`
      : 'Sin enlaces.',
  ];
  return frases.join(' ');
}

/**
 * «Paquete con IPv4 (capa 3, Red): sobre el enlace de A hacia B.» Si el paso nombra la PDU
 * y la capa: «Trama Ethernet con Ethernet II (capa 2, Enlace de datos) y FCS (cola de la
 * capa 2, Enlace de datos): en la capa 2 de B.» Las partes van en el orden del cable.
 */
export function describirPaquete(paquete: Paquete, topologia: Topologia): string {
  const etiqueta = (id: string) => topologia.nodos.find((n) => n.id === id)?.etiqueta ?? id;
  const partes = partesEnElCable(paquete).flatMap((p) => {
    if (p.tipo === 'datos') return [];
    const capa = `capa ${p.capa}, ${NOMBRE_CAPA[p.capa]}`;
    return [`${p.encabezado.nombre} (${p.tipo === 'cola' ? `cola de la ${capa}` : capa})`];
  });
  const nombre = paquete.pdu ?? 'Paquete';
  const que = partes.length > 0 ? `${nombre} con ${enumerar(partes)}` : `${nombre} sin encabezados`;
  const { ubicacion } = paquete;
  let donde: string;
  if (ubicacion.tipo === 'enlace') {
    donde = `sobre el enlace de ${etiqueta(ubicacion.desde)} hacia ${etiqueta(ubicacion.hacia)}`;
  } else if (ubicacion.capa !== undefined) {
    donde = `en la capa ${ubicacion.capa} de ${etiqueta(ubicacion.nodo)}`;
  } else {
    donde = `en ${etiqueta(ubicacion.nodo)}`;
  }
  return `${que}: ${donde}.`;
}

/** Describe dónde están los paquetes del paso. */
export function describirPaso(paso: Step, topologia: Topologia): string {
  if (paso.paquetes.length === 0) return 'No hay paquetes en este paso.';
  return paso.paquetes.map((p) => describirPaquete(p, topologia)).join(' ');
}

// ---------------------------------------------------------------------------------------
// Vista de pila
// ---------------------------------------------------------------------------------------

/** «capa 1», «capas 1 a 4» o, si hay huecos, «capas 1, 2 y 4». */
export function describirCapas(capas: readonly number[]): string {
  if (capas.length === 1) return `capa ${capas[0]}`;
  const contiguas = capas.every((c, i) => i === 0 || c === (capas[i - 1] ?? c) + 1);
  return contiguas ? `capas ${capas[0]} a ${capas.at(-1)}` : `capas ${enumerar(capas.map(String))}`;
}

/**
 * «Pila de cada equipo: A (host), capas 1 a 7; B (router), capas 1 a 3.» Los equipos van
 * en el orden en que se recibe la lista (el de las columnas del diagrama).
 */
export function describirPilas(nodos: readonly Nodo[]): string {
  if (nodos.length === 0) return 'Sin equipos.';
  const pilas = nodos.map((n) => {
    const equipo = `${n.etiqueta} (${NOMBRE_TIPO[n.tipo].toLowerCase()})`;
    const capas = n.capas ?? [];
    return `${equipo}, ${capas.length > 0 ? describirCapas(capas) : 'sin pila declarada'}`;
  });
  return `Pila de cada equipo: ${pilas.join('; ')}.`;
}

/**
 * Dónde está la PDU en la pila: «Trama Ethernet en la capa 2 (Enlace de datos) de A.»,
 * «Bits sobre el enlace de A hacia B.» o «PDU en A.» si el paso no dice la capa.
 */
export function describirPduEnPila(paquete: Paquete, topologia: Topologia): string {
  const etiqueta = (id: string) => topologia.nodos.find((n) => n.id === id)?.etiqueta ?? id;
  const nombre = paquete.pdu ?? 'PDU';
  const { ubicacion } = paquete;
  if (ubicacion.tipo === 'enlace') {
    return `${nombre} sobre el enlace de ${etiqueta(ubicacion.desde)} hacia ${etiqueta(ubicacion.hacia)}.`;
  }
  if (ubicacion.capa === undefined) return `${nombre} en ${etiqueta(ubicacion.nodo)}.`;
  return `${nombre} en la capa ${ubicacion.capa} (${NOMBRE_CAPA[ubicacion.capa]}) de ${etiqueta(ubicacion.nodo)}.`;
}

/** Describe dónde está cada PDU del paso, en la vista de pila. */
export function describirPasoEnPila(paso: Step, topologia: Topologia): string {
  if (paso.paquetes.length === 0) return 'No hay PDU en este paso.';
  return paso.paquetes.map((p) => describirPduEnPila(p, topologia)).join(' ');
}
