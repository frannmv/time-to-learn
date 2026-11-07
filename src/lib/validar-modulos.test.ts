import { describe, expect, it } from 'vitest';
import {
  ErrorColeccionModulos,
  modulosVisibles,
  validarModulos,
  type EntradaModulo,
} from './validar-modulos';

/** Arma una entrada con lo mínimo que miran las validaciones. */
const modulo = (
  id: string,
  orden: number,
  prerrequisitos: string[] = [],
  oculto = false,
): EntradaModulo => ({
  id,
  data: { orden, oculto, prerrequisitos: prerrequisitos.map((p) => ({ id: p })) },
});

/** Problemas que reporta `validarModulos` (falla el test si no lanza). */
function problemas(entradas: EntradaModulo[]): readonly string[] {
  try {
    validarModulos(entradas);
  } catch (error) {
    expect(error).toBeInstanceOf(ErrorColeccionModulos);
    return (error as ErrorColeccionModulos).problemas;
  }
  throw new Error('se esperaba que la colección fuera inválida');
}

describe('validarModulos', () => {
  it('acepta una colección válida', () => {
    expect(() =>
      validarModulos([modulo('a', 1), modulo('b', 2, ['a']), modulo('c', 3, ['a', 'b'])]),
    ).not.toThrow();
  });

  it('acepta una colección vacía', () => {
    expect(() => validarModulos([])).not.toThrow();
  });

  it('rechaza un orden duplicado y nombra los módulos', () => {
    expect(problemas([modulo('b', 1), modulo('a', 1), modulo('c', 2)])).toEqual([
      '«orden: 1» se repite en: a, b.',
    ]);
  });

  it('el orden tiene que ser único también contra los ocultos', () => {
    expect(problemas([modulo('a', 0), modulo('ejemplo', 0, [], true)])).toHaveLength(1);
  });

  it('rechaza un módulo que es prerrequisito de sí mismo', () => {
    expect(problemas([modulo('a', 1, ['a'])])).toEqual([
      '«a» figura como prerrequisito de sí mismo.',
    ]);
  });

  it('rechaza un prerrequisito que no existe', () => {
    expect(problemas([modulo('a', 1, ['fantasma'])])).toEqual([
      '«a» tiene como prerrequisito a «fantasma», que no existe.',
    ]);
  });

  it('rechaza un ciclo de dos módulos y lo muestra', () => {
    expect(problemas([modulo('a', 1, ['b']), modulo('b', 2, ['a'])])).toEqual([
      'Los prerrequisitos forman un ciclo: a → b → a.',
    ]);
  });

  it('rechaza un ciclo de tres módulos', () => {
    const entradas = [modulo('a', 1, ['c']), modulo('b', 2, ['a']), modulo('c', 3, ['b'])];
    expect(problemas(entradas)).toEqual(['Los prerrequisitos forman un ciclo: a → c → b → a.']);
  });

  it('no confunde un diamante con un ciclo', () => {
    const entradas = [
      modulo('a', 1),
      modulo('b', 2, ['a']),
      modulo('c', 3, ['a']),
      modulo('d', 4, ['b', 'c']),
    ];
    expect(() => validarModulos(entradas)).not.toThrow();
  });

  it('reporta todos los problemas juntos en un mensaje legible', () => {
    const entradas = [modulo('a', 1, ['a']), modulo('b', 1, ['c']), modulo('c', 2, ['b'])];
    expect(() => validarModulos(entradas)).toThrow(
      [
        'La colección de módulos tiene 3 problemas:',
        '  - «orden: 1» se repite en: a, b.',
        '  - «a» figura como prerrequisito de sí mismo.',
        '  - Los prerrequisitos forman un ciclo: b → c → b.',
      ].join('\n'),
    );
  });
});

describe('modulosVisibles', () => {
  it('excluye los ocultos y ordena por orden', () => {
    const entradas = [
      modulo('c', 3),
      modulo('ejemplo', 0, [], true),
      modulo('a', 1),
      modulo('b', 2, ['a']),
    ];
    expect(modulosVisibles(entradas).map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('valida antes de filtrar: un oculto inválido también rompe', () => {
    expect(() => modulosVisibles([modulo('ejemplo', 0, ['ejemplo'], true)])).toThrow(
      ErrorColeccionModulos,
    );
  });

  it('no modifica la lista recibida', () => {
    const entradas = [modulo('b', 2), modulo('a', 1)];
    modulosVisibles(entradas);
    expect(entradas.map((m) => m.id)).toEqual(['b', 'a']);
  });
});
