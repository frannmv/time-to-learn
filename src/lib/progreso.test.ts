import { describe, expect, it, vi } from 'vitest';
import {
  CLAVE_PROGRESO,
  EVENTO_PROGRESO,
  PROGRESO_VACIO,
  interpretarProgreso,
  leerProgreso,
  leerProgresoCrudo,
  registrarResultado,
  suscribirProgreso,
  type Almacen,
  type DetalleProgreso,
} from './progreso';

/** Almacenamiento falso en memoria, con la misma interfaz que `localStorage`. */
function almacenFalso(
  inicial: Record<string, string> = {},
): Almacen & { datos: Map<string, string> } {
  const datos = new Map(Object.entries(inicial));
  return {
    datos,
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => void datos.set(clave, valor),
  };
}

/** Almacenamiento que lanza en todo acceso (navegación privada, cookies bloqueadas). */
const almacenQueFalla: Almacen = {
  getItem: () => {
    throw new DOMException('Bloqueado', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('Sin espacio', 'QuotaExceededError');
  },
};

const guardadoV1 = (modulos: unknown) => JSON.stringify({ version: 1, modulos });

const sinEventos = { objetivo: null };

describe('leerProgreso', () => {
  it('sin nada guardado devuelve el progreso vacío', () => {
    expect(leerProgreso(almacenFalso())).toEqual(PROGRESO_VACIO);
  });

  it('sin almacenamiento devuelve el progreso vacío', () => {
    expect(leerProgreso(null)).toEqual(PROGRESO_VACIO);
  });

  it('si el almacenamiento lanza un error devuelve el progreso vacío', () => {
    expect(leerProgresoCrudo(almacenQueFalla)).toBeNull();
    expect(leerProgreso(almacenQueFalla)).toEqual(PROGRESO_VACIO);
  });

  it('lee lo guardado en la versión actual', () => {
    const almacen = almacenFalso({
      [CLAVE_PROGRESO]: guardadoV1({ ejemplo: { completado: true, mejor: 2, total: 3 } }),
    });
    expect(leerProgreso(almacen)).toEqual({
      modulos: { ejemplo: { completado: true, mejor: 2, total: 3 } },
    });
  });
});

describe('interpretarProgreso', () => {
  it.each([
    ['JSON roto', '{"version":1,'],
    ['un número', '42'],
    ['null', 'null'],
    ['una lista', '[]'],
    ['sin módulos', '{"version":1}'],
    ['módulos como lista', '{"version":1,"modulos":[]}'],
  ])('descarta datos corruptos: %s', (_, texto) => {
    expect(interpretarProgreso(texto)).toEqual(PROGRESO_VACIO);
  });

  it('descarta una versión vieja o desconocida', () => {
    const modulos = { ejemplo: { completado: true, mejor: 1, total: 3 } };
    expect(interpretarProgreso(JSON.stringify({ version: 0, modulos }))).toEqual(PROGRESO_VACIO);
    expect(interpretarProgreso(JSON.stringify({ modulos }))).toEqual(PROGRESO_VACIO);
  });

  it('descarta solo los módulos con datos inválidos y limpia campos de más', () => {
    const texto = guardadoV1({
      bien: { completado: true, mejor: 3, total: 3, extra: 'x' },
      cero: { completado: true, mejor: 0, total: 4 },
      noCompletado: { completado: false, mejor: 1, total: 3 },
      deMas: { completado: true, mejor: 4, total: 3 },
      negativo: { completado: true, mejor: -1, total: 3 },
      sinPreguntas: { completado: true, mejor: 0, total: 0 },
      decimal: { completado: true, mejor: 1.5, total: 3 },
      texto: { completado: true, mejor: '2', total: 3 },
      nulo: null,
    });
    expect(interpretarProgreso(texto)).toEqual({
      modulos: {
        bien: { completado: true, mejor: 3, total: 3 },
        cero: { completado: true, mejor: 0, total: 4 },
      },
    });
  });
});

describe('registrarResultado', () => {
  it('guarda el módulo como completado con su puntaje, en la clave versionada', () => {
    const almacen = almacenFalso();
    const detalle = registrarResultado('ejemplo', 2, 3, { almacen, ...sinEventos });

    expect(detalle).toEqual({
      moduloId: 'ejemplo',
      guardado: true,
      progreso: { modulos: { ejemplo: { completado: true, mejor: 2, total: 3 } } },
    });
    expect(JSON.parse(almacen.datos.get(CLAVE_PROGRESO) ?? '')).toEqual({
      version: 1,
      modulos: { ejemplo: { completado: true, mejor: 2, total: 3 } },
    });
    expect(leerProgreso(almacen)).toEqual(detalle.progreso);
  });

  it('cero aciertos también completa el módulo', () => {
    const almacen = almacenFalso();
    registrarResultado('ejemplo', 0, 3, { almacen, ...sinEventos });
    expect(leerProgreso(almacen).modulos.ejemplo).toEqual({ completado: true, mejor: 0, total: 3 });
  });

  it('conserva el mejor puntaje', () => {
    const almacen = almacenFalso();
    registrarResultado('ejemplo', 2, 3, { almacen, ...sinEventos });
    registrarResultado('ejemplo', 1, 3, { almacen, ...sinEventos });
    expect(leerProgreso(almacen).modulos.ejemplo?.mejor).toBe(2);
    registrarResultado('ejemplo', 3, 3, { almacen, ...sinEventos });
    expect(leerProgreso(almacen).modulos.ejemplo?.mejor).toBe(3);
  });

  it('si el quiz cambió de tamaño, reemplaza el puntaje anterior', () => {
    const almacen = almacenFalso();
    registrarResultado('ejemplo', 3, 3, { almacen, ...sinEventos });
    registrarResultado('ejemplo', 1, 4, { almacen, ...sinEventos });
    expect(leerProgreso(almacen).modulos.ejemplo).toEqual({ completado: true, mejor: 1, total: 4 });
  });

  it('no toca los demás módulos', () => {
    const almacen = almacenFalso();
    registrarResultado('a', 1, 3, { almacen, ...sinEventos });
    registrarResultado('b', 3, 3, { almacen, ...sinEventos });
    expect(Object.keys(leerProgreso(almacen).modulos).sort()).toEqual(['a', 'b']);
  });

  it('sobre datos corruptos, empieza de cero', () => {
    const almacen = almacenFalso({ [CLAVE_PROGRESO]: 'no es JSON' });
    registrarResultado('ejemplo', 2, 3, { almacen, ...sinEventos });
    expect(leerProgreso(almacen).modulos).toEqual({
      ejemplo: { completado: true, mejor: 2, total: 3 },
    });
  });

  it('si el almacenamiento falla, no lanza y avisa que no se guardó', () => {
    expect(
      registrarResultado('ejemplo', 2, 3, { almacen: almacenQueFalla, ...sinEventos }),
    ).toEqual({
      moduloId: 'ejemplo',
      guardado: false,
      progreso: { modulos: { ejemplo: { completado: true, mejor: 2, total: 3 } } },
    });
  });

  it('sin almacenamiento, tampoco lanza', () => {
    expect(registrarResultado('ejemplo', 2, 3, { almacen: null, ...sinEventos }).guardado).toBe(
      false,
    );
  });

  it.each([
    ['id vacío', '  ', 1, 3],
    ['sin preguntas', 'ejemplo', 0, 0],
    ['aciertos negativos', 'ejemplo', -1, 3],
    ['más aciertos que preguntas', 'ejemplo', 4, 3],
    ['aciertos no enteros', 'ejemplo', 1.5, 3],
  ])('rechaza argumentos inválidos: %s', (_, id, aciertos, total) => {
    expect(() =>
      registrarResultado(id, aciertos, total, { almacen: almacenFalso(), ...sinEventos }),
    ).toThrow(RangeError);
  });

  it('emite el evento con el detalle, aunque no se haya podido guardar', () => {
    const objetivo = new EventTarget();
    const escuchar = vi.fn((evento: Event) => (evento as CustomEvent<DetalleProgreso>).detail);
    objetivo.addEventListener(EVENTO_PROGRESO, escuchar);

    const detalle = registrarResultado('ejemplo', 1, 3, { almacen: almacenQueFalla, objetivo });

    expect(escuchar).toHaveBeenCalledOnce();
    expect(escuchar.mock.results[0]?.value).toEqual(detalle);
  });
});

describe('suscribirProgreso', () => {
  it('avisa al registrar un resultado y deja de avisar al cancelar', () => {
    const objetivo = new EventTarget();
    const alCambiar = vi.fn();
    const cancelar = suscribirProgreso(alCambiar, objetivo);

    registrarResultado('ejemplo', 1, 3, { almacen: almacenFalso(), objetivo });
    expect(alCambiar).toHaveBeenCalledOnce();

    cancelar();
    registrarResultado('ejemplo', 2, 3, { almacen: almacenFalso(), objetivo });
    expect(alCambiar).toHaveBeenCalledOnce();
  });

  it('avisa cuando otra pestaña cambia el progreso, y no por otras claves', () => {
    const objetivo = new EventTarget();
    const alCambiar = vi.fn();
    suscribirProgreso(alCambiar, objetivo);

    const almacenamiento = (key: string | null) =>
      Object.assign(new Event('storage'), { key }) as Event;
    objetivo.dispatchEvent(almacenamiento('otra-clave'));
    expect(alCambiar).not.toHaveBeenCalled();
    objetivo.dispatchEvent(almacenamiento(CLAVE_PROGRESO));
    objetivo.dispatchEvent(almacenamiento(null));
    expect(alCambiar).toHaveBeenCalledTimes(2);
  });

  it('sin destino de eventos devuelve una cancelación que no hace nada', () => {
    expect(() => suscribirProgreso(() => {}, null)()).not.toThrow();
  });
});
