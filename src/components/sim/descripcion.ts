/**
 * Descripciones en texto del diagrama, para lectores de pantalla. Dicen lo mismo que el
 * dibujo, sin depender del color ni de las formas: qué nodos hay, cómo se conectan y dónde
 * está cada paquete. Solo leen la topología y el paso; no deciden nada.
 */
import { NOMBRE_CAPA } from '../../engine/core/capas';
import type { Paquete, Step, Topologia } from '../../engine/core/timeline';
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

/** «Paquete con IPv4 (capa 3, Red): sobre el enlace de A hacia B.» */
export function describirPaquete(paquete: Paquete, topologia: Topologia): string {
  const etiqueta = (id: string) => topologia.nodos.find((n) => n.id === id)?.etiqueta ?? id;
  const encabezados = paquete.encabezados.map(
    (e) => `${e.nombre} (capa ${e.capa}, ${NOMBRE_CAPA[e.capa]})`,
  );
  const que =
    encabezados.length > 0 ? `Paquete con ${enumerar(encabezados)}` : 'Paquete sin encabezados';
  const { ubicacion } = paquete;
  const donde =
    ubicacion.tipo === 'nodo'
      ? `en ${etiqueta(ubicacion.nodo)}`
      : `sobre el enlace de ${etiqueta(ubicacion.desde)} hacia ${etiqueta(ubicacion.hacia)}`;
  return `${que}: ${donde}.`;
}

/** Describe dónde están los paquetes del paso. */
export function describirPaso(paso: Step, topologia: Topologia): string {
  if (paso.paquetes.length === 0) return 'No hay paquetes en este paso.';
  return paso.paquetes.map((p) => describirPaquete(p, topologia)).join(' ');
}
