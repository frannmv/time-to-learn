import { describe, expect, it } from 'vitest';
import {
  aciertos,
  crearEstadoQuiz,
  esCorrecta,
  quiz,
  terminado,
  type AccionQuiz,
} from './estado-quiz';

/** Quiz de tres preguntas cuyas respuestas correctas son 1, 0 y 2. */
const nuevo = () => crearEstadoQuiz([1, 0, 2]);

const aplicar = (acciones: AccionQuiz[], estado = nuevo()) => acciones.reduce(quiz, estado);

const responder = (pregunta: number, opcion: number): AccionQuiz[] => [
  { tipo: 'elegir', pregunta, opcion },
  { tipo: 'comprobar', pregunta },
];

describe('crearEstadoQuiz', () => {
  it('empieza sin respuestas', () => {
    expect(nuevo()).toEqual({
      correctas: [1, 0, 2],
      elegidas: [null, null, null],
      comprobadas: [false, false, false],
    });
  });

  it('rechaza un quiz vacío o con índices inválidos', () => {
    expect(() => crearEstadoQuiz([])).toThrow(RangeError);
    expect(() => crearEstadoQuiz([-1])).toThrow(RangeError);
    expect(() => crearEstadoQuiz([0.5])).toThrow(RangeError);
  });
});

describe('quiz', () => {
  describe('elegir', () => {
    it('marca la opción elegida y se puede cambiar antes de comprobar', () => {
      const estado = aplicar([
        { tipo: 'elegir', pregunta: 0, opcion: 2 },
        { tipo: 'elegir', pregunta: 0, opcion: 1 },
      ]);
      expect(estado.elegidas).toEqual([1, null, null]);
      expect(estado.comprobadas).toEqual([false, false, false]);
    });

    it('elegir sola no corrige', () => {
      const estado = aplicar([{ tipo: 'elegir', pregunta: 0, opcion: 1 }]);
      expect(esCorrecta(estado, 0)).toBe(false);
      expect(aciertos(estado)).toBe(0);
    });

    it('no cambia una pregunta ya comprobada', () => {
      const estado = aplicar(responder(0, 2));
      expect(quiz(estado, { tipo: 'elegir', pregunta: 0, opcion: 1 })).toBe(estado);
    });

    it('ignora preguntas u opciones fuera de rango y elegir lo mismo', () => {
      const estado = aplicar([{ tipo: 'elegir', pregunta: 1, opcion: 0 }]);
      expect(quiz(estado, { tipo: 'elegir', pregunta: 3, opcion: 0 })).toBe(estado);
      expect(quiz(estado, { tipo: 'elegir', pregunta: -1, opcion: 0 })).toBe(estado);
      expect(quiz(estado, { tipo: 'elegir', pregunta: 0, opcion: -1 })).toBe(estado);
      expect(quiz(estado, { tipo: 'elegir', pregunta: 1, opcion: 0 })).toBe(estado);
    });
  });

  describe('comprobar', () => {
    it('corrige una respuesta correcta', () => {
      const estado = aplicar(responder(0, 1));
      expect(estado.comprobadas).toEqual([true, false, false]);
      expect(esCorrecta(estado, 0)).toBe(true);
      expect(aciertos(estado)).toBe(1);
    });

    it('corrige una respuesta incorrecta', () => {
      const estado = aplicar(responder(0, 0));
      expect(estado.comprobadas[0]).toBe(true);
      expect(esCorrecta(estado, 0)).toBe(false);
      expect(aciertos(estado)).toBe(0);
    });

    it('sin opción elegida no hace nada', () => {
      const estado = nuevo();
      expect(quiz(estado, { tipo: 'comprobar', pregunta: 0 })).toBe(estado);
    });

    it('comprobar dos veces no cambia nada', () => {
      const estado = aplicar(responder(0, 1));
      expect(quiz(estado, { tipo: 'comprobar', pregunta: 0 })).toBe(estado);
    });
  });

  describe('terminado y aciertos', () => {
    it('termina cuando todas las preguntas se comprobaron, en cualquier orden', () => {
      const parcial = aplicar([...responder(2, 2), ...responder(0, 0)]);
      expect(terminado(parcial)).toBe(false);
      const final = aplicar(responder(1, 0), parcial);
      expect(terminado(final)).toBe(true);
      expect(aciertos(final)).toBe(2);
    });

    it('cuenta aciertos de 0 a todas', () => {
      expect(aciertos(aplicar([...responder(0, 0), ...responder(1, 1), ...responder(2, 0)]))).toBe(
        0,
      );
      expect(aciertos(aplicar([...responder(0, 1), ...responder(1, 0), ...responder(2, 2)]))).toBe(
        3,
      );
    });
  });

  describe('reintentar', () => {
    it('borra todas las respuestas', () => {
      const estado = aplicar([...responder(0, 1), { tipo: 'elegir', pregunta: 1, opcion: 1 }]);
      expect(quiz(estado, { tipo: 'reintentar' })).toEqual(nuevo());
    });

    it('sin respuestas no cambia nada', () => {
      const estado = nuevo();
      expect(quiz(estado, { tipo: 'reintentar' })).toBe(estado);
    });
  });
});
