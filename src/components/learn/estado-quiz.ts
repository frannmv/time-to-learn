/**
 * Estado de un quiz: qué opción eligió el estudiante en cada pregunta y cuáles ya comprobó.
 *
 * Es estado de la interfaz, no lógica de protocolos: solo compara índices. Es un reducer puro
 * para poder probarlo sin React, igual que `stepper.ts` de la simulación.
 *
 * Elegir una opción y comprobarla son dos pasos separados: con un grupo de radio, las flechas
 * del teclado ya cambian la selección, así que corregir al elegir confirmaría respuestas sin
 * querer.
 */

export interface EstadoQuiz {
  /** Índice (desde 0) de la opción correcta de cada pregunta. */
  readonly correctas: readonly number[];
  /** Opción elegida en cada pregunta, o `null` si todavía no eligió. */
  readonly elegidas: readonly (number | null)[];
  /** Si cada pregunta ya se comprobó. Una pregunta comprobada no cambia más. */
  readonly comprobadas: readonly boolean[];
}

export type AccionQuiz =
  | { readonly tipo: 'elegir'; readonly pregunta: number; readonly opcion: number }
  /** Corrige la pregunta. No hace nada si no hay opción elegida. */
  | { readonly tipo: 'comprobar'; readonly pregunta: number }
  /** Borra todas las respuestas para volver a empezar. */
  | { readonly tipo: 'reintentar' };

export function crearEstadoQuiz(correctas: readonly number[]): EstadoQuiz {
  if (correctas.length === 0) throw new RangeError('El quiz necesita al menos una pregunta.');
  if (correctas.some((c) => !Number.isInteger(c) || c < 0)) {
    throw new RangeError('Cada respuesta correcta es un índice entero desde 0.');
  }
  return {
    correctas,
    elegidas: correctas.map(() => null),
    comprobadas: correctas.map(() => false),
  };
}

/** Si la pregunta se comprobó y la opción elegida es la correcta. */
export const esCorrecta = (estado: EstadoQuiz, pregunta: number): boolean =>
  estado.comprobadas[pregunta] === true && estado.elegidas[pregunta] === estado.correctas[pregunta];

export const aciertos = (estado: EstadoQuiz): number =>
  estado.correctas.filter((_, i) => esCorrecta(estado, i)).length;

/** Todas las preguntas comprobadas: el quiz terminó. */
export const terminado = (estado: EstadoQuiz): boolean => estado.comprobadas.every(Boolean);

const reemplazar = <T>(lista: readonly T[], indice: number, valor: T): T[] =>
  lista.map((v, i) => (i === indice ? valor : v));

/** Devuelve el mismo objeto si nada cambia, así React no vuelve a dibujar de más. */
export function quiz(estado: EstadoQuiz, accion: AccionQuiz): EstadoQuiz {
  switch (accion.tipo) {
    case 'elegir': {
      const { pregunta, opcion } = accion;
      if (!(pregunta in estado.correctas) || estado.comprobadas[pregunta]) return estado;
      if (!Number.isInteger(opcion) || opcion < 0) return estado;
      if (estado.elegidas[pregunta] === opcion) return estado;
      return { ...estado, elegidas: reemplazar(estado.elegidas, pregunta, opcion) };
    }
    case 'comprobar': {
      const { pregunta } = accion;
      if (!(pregunta in estado.correctas) || estado.comprobadas[pregunta]) return estado;
      if (estado.elegidas[pregunta] === null) return estado;
      return { ...estado, comprobadas: reemplazar(estado.comprobadas, pregunta, true) };
    }
    case 'reintentar':
      if (estado.elegidas.every((e) => e === null)) return estado;
      return crearEstadoQuiz(estado.correctas);
  }
}
