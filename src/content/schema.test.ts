import { readFileSync } from 'node:fs';
import { parseFrontmatter } from 'astro/markdown';
import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';
import { BLOQUES, crearEsquemaModulo } from './schema';

/**
 * En la colección los prerrequisitos se validan con `reference('modules')`, que vive en el
 * módulo virtual `astro:content`. Acá se usa un equivalente con la misma salida.
 */
const referencia = z.string().transform((id) => ({ id, collection: 'modules' }));
const esquema = crearEsquemaModulo(referencia);

/** Frontmatter del módulo de ejemplo, leído del archivo real con el parser de Astro. */
function frontmatterEjemplo(): Record<string, unknown> {
  const texto = readFileSync(new URL('./modules/ejemplo.mdx', import.meta.url), 'utf8');
  return parseFrontmatter(texto).frontmatter;
}

const pregunta = (correcta = 0) => ({
  pregunta: '¿Pregunta?',
  opciones: ['A', 'B', 'C'],
  correcta,
  explicacion: 'Porque sí.',
});

/** Frontmatter válido mínimo, para variar un campo por test. */
const valido = () => ({
  titulo: 'Módulo',
  descripcion: 'Una frase.',
  capas: [2],
  bloque: 'LAN',
  orden: 1,
  minutos: 10,
  fuentes: [{ tipo: 'rfc', id: 'RFC 1071', titulo: 'Computing the Internet Checksum' }],
  quiz: [pregunta(), pregunta(), pregunta()],
});

/** Mensajes de error de un frontmatter que tiene que fallar. */
function errores(datos: unknown): string[] {
  const resultado = esquema.safeParse(datos);
  expect(resultado.success, 'se esperaba que el esquema rechazara el frontmatter').toBe(false);
  return resultado.error?.issues.map((i) => i.message) ?? [];
}

describe('esquema de módulos', () => {
  it('acepta el frontmatter del módulo de ejemplo', () => {
    const resultado = esquema.safeParse(frontmatterEjemplo());
    expect(resultado.error?.issues).toBeUndefined();
    expect(resultado.data?.oculto).toBe(true);
    expect(resultado.data?.fuentes[0]?.id).toBe('RFC 1071');
  });

  it('completa los valores por defecto', () => {
    const datos = esquema.parse(valido());
    expect(datos.oculto).toBe(false);
    expect(datos.prerrequisitos).toEqual([]);
  });

  it('convierte los prerrequisitos en referencias', () => {
    const datos = esquema.parse({ ...valido(), prerrequisitos: ['ethernet'] });
    expect(datos.prerrequisitos).toEqual([{ id: 'ethernet', collection: 'modules' }]);
  });

  describe('capas', () => {
    it.each([0, 8, 2.5, '3'])('rechaza la capa %j', (capa) => {
      expect(errores({ ...valido(), capas: [capa] }).join()).toMatch(/de 1 \(física\) a 7/);
    });

    it('rechaza una lista vacía', () => {
      expect(errores({ ...valido(), capas: [] }).join()).toMatch(/al menos una capa/);
    });

    it('acepta varias capas, la primera es la principal', () => {
      expect(esquema.parse({ ...valido(), capas: [3, 2] }).capas).toEqual([3, 2]);
    });
  });

  describe('bloque', () => {
    it.each(BLOQUES)('acepta «%s»', (bloque) => {
      expect(esquema.safeParse({ ...valido(), bloque }).success).toBe(true);
    });

    it('rechaza un bloque inexistente y lista los válidos', () => {
      expect(errores({ ...valido(), bloque: 'Seguridad' }).join()).toMatch(
        /Fundamentos, LAN, Red, Transporte, Servicios, WAN, Cierre/,
      );
    });
  });

  describe('fuentes', () => {
    it('es obligatoria', () => {
      const sinFuentes: Partial<ReturnType<typeof valido>> = valido();
      delete sinFuentes.fuentes;
      expect(errores(sinFuentes)).toHaveLength(1);
    });

    it('no puede estar vacía', () => {
      expect(errores({ ...valido(), fuentes: [] }).join()).toMatch(/al menos una fuente/);
    });

    it('rechaza un tipo de fuente desconocido', () => {
      const fuentes = [{ tipo: 'blog', id: 'X', titulo: 'Y' }];
      expect(errores({ ...valido(), fuentes }).join()).toMatch(/rfc, estandar, libro, apunte/);
    });

    it('rechaza una URL inválida', () => {
      const fuentes = [{ tipo: 'rfc', id: 'RFC 1071', titulo: 'T', url: 'no es url' }];
      expect(errores({ ...valido(), fuentes }).join()).toMatch(/URL válida/);
    });
  });

  describe('quiz', () => {
    it.each([2, 6])('rechaza %i preguntas', (cantidad) => {
      const quiz = Array.from({ length: cantidad }, () => pregunta());
      expect(errores({ ...valido(), quiz }).join()).toMatch(/quiz/);
    });

    it.each([3, 5])('acepta %i preguntas', (cantidad) => {
      const quiz = Array.from({ length: cantidad }, () => pregunta());
      expect(esquema.safeParse({ ...valido(), quiz }).success).toBe(true);
    });

    it.each([3, 10])('rechaza «correcta» = %i con 3 opciones', (correcta) => {
      const quiz = [pregunta(correcta), pregunta(), pregunta()];
      expect(errores({ ...valido(), quiz }).join()).toMatch(/índices 0 a 2/);
    });

    it('rechaza «correcta» negativa', () => {
      const quiz = [pregunta(-1), pregunta(), pregunta()];
      expect(errores({ ...valido(), quiz }).join()).toMatch(/no puede ser negativo/);
    });

    it('rechaza opciones repetidas', () => {
      const quiz = [{ ...pregunta(), opciones: ['A', 'A'] }, pregunta(), pregunta()];
      expect(errores({ ...valido(), quiz }).join()).toMatch(/no pueden repetirse/);
    });

    it('rechaza una sola opción', () => {
      const quiz = [{ ...pregunta(), opciones: ['A'] }, pregunta(), pregunta()];
      expect(errores({ ...valido(), quiz }).join()).toMatch(/al menos 2 opciones/);
    });
  });

  it.each([
    ['orden', -1],
    ['orden', 1.5],
    ['minutos', 0],
  ])('rechaza «%s» = %j', (campo, valor) => {
    expect(errores({ ...valido(), [campo]: valor }).join()).toMatch(campo);
  });

  it('rechaza campos desconocidos (evita errores de tipeo)', () => {
    expect(esquema.safeParse({ ...valido(), ocultó: true }).success).toBe(false);
  });

  it('rechaza un título vacío', () => {
    expect(errores({ ...valido(), titulo: '   ' }).join()).toMatch(/«titulo» no puede estar vacío/);
  });
});
