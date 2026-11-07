/**
 * Progreso del estudiante: qué módulos completó y su mejor puntaje en el quiz. Se guarda solo
 * en el navegador (LINEAMIENTOS: sin cuentas ni backend).
 *
 * Un módulo cuenta como **completado** cuando se responden todas las preguntas de su quiz, sin
 * importar los aciertos (pregunta abierta 1 del plan de la Etapa 1). Además se guarda el mejor
 * puntaje.
 *
 * El almacenamiento puede no existir o fallar (navegación privada, cookies bloqueadas, cuota
 * llena): todo acceso va dentro de `try/catch` y, si falla, el sitio sigue funcionando sin
 * recordar nada. Los datos guardados que no se entienden (otra versión, JSON roto, valores
 * fuera de rango) se descartan.
 *
 * Cada vez que se registra un resultado o se reinicia el progreso se emite el evento
 * {@link EVENTO_PROGRESO}, para que otras islas de la página (el indicador TTL de la pieza 1.9)
 * se enteren sin recargar.
 */

/** Versión del formato guardado. Si cambia, cambia también la clave. */
export const VERSION_PROGRESO = 1;

/** Clave de `localStorage`, versionada. */
export const CLAVE_PROGRESO = `ttl:progreso:v${VERSION_PROGRESO}`;

/**
 * Evento (`CustomEvent<DetalleProgreso>`) que se emite en `window` al registrar un resultado o
 * al reiniciar el progreso.
 */
export const EVENTO_PROGRESO = 'ttl:progreso';

export interface ResultadoModulo {
  /** Siempre `true`: solo se guardan los módulos completados. */
  readonly completado: true;
  /** Mejor cantidad de aciertos. */
  readonly mejor: number;
  /** Cantidad de preguntas del quiz cuando se obtuvo ese puntaje. */
  readonly total: number;
}

export interface Progreso {
  /** Resultado de cada módulo completado, por id de módulo. */
  readonly modulos: Readonly<Record<string, ResultadoModulo>>;
}

export interface DetalleProgreso {
  /** Módulo cuyo resultado se registró, o `null` si se reinició todo el progreso. */
  readonly moduloId: string | null;
  readonly progreso: Progreso;
  /**
   * `false` si no se pudo guardar (el progreso vale solo hasta recargar) o, al reiniciar, si no
   * se pudo borrar lo guardado.
   */
  readonly guardado: boolean;
}

/** Lo mínimo que se usa de `Storage`; los tests pasan uno falso. */
export type Almacen = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Destino de los eventos; en el navegador es `window`. */
export type Objetivo = Pick<
  EventTarget,
  'addEventListener' | 'removeEventListener' | 'dispatchEvent'
>;

export const PROGRESO_VACIO: Progreso = Object.freeze({ modulos: Object.freeze({}) });

/**
 * `localStorage` del navegador, o `null` si no hay o si el solo hecho de leerlo lanza un error
 * (algunos navegadores lanzan `SecurityError` con el almacenamiento bloqueado).
 */
export function almacenDelNavegador(): Almacen | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function objetivoDelNavegador(): Objetivo | null {
  return typeof window === 'undefined' ? null : window;
}

/** Texto guardado tal cual, o `null` si no hay nada o no se pudo leer. */
export function leerProgresoCrudo(almacen: Almacen | null = almacenDelNavegador()): string | null {
  if (!almacen) return null;
  try {
    return almacen.getItem(CLAVE_PROGRESO);
  } catch {
    return null;
  }
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

function esResultado(valor: unknown): valor is ResultadoModulo {
  if (!esObjeto(valor)) return false;
  const { completado, mejor, total } = valor;
  return (
    completado === true &&
    Number.isInteger(total) &&
    Number.isInteger(mejor) &&
    (total as number) >= 1 &&
    (mejor as number) >= 0 &&
    (mejor as number) <= (total as number)
  );
}

/**
 * Interpreta el texto guardado. Devuelve el progreso vacío si no hay nada, si el JSON está
 * roto o si es de otra versión; los módulos con datos inválidos se descartan uno por uno.
 */
export function interpretarProgreso(texto: string | null): Progreso {
  if (texto === null) return PROGRESO_VACIO;
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    return PROGRESO_VACIO;
  }
  if (!esObjeto(datos) || datos.version !== VERSION_PROGRESO || !esObjeto(datos.modulos)) {
    return PROGRESO_VACIO;
  }
  const modulos: Record<string, ResultadoModulo> = {};
  for (const [id, resultado] of Object.entries(datos.modulos)) {
    if (esResultado(resultado)) {
      modulos[id] = { completado: true, mejor: resultado.mejor, total: resultado.total };
    }
  }
  return { modulos };
}

/** Progreso guardado (o vacío si no hay o no se puede leer). */
export function leerProgreso(almacen: Almacen | null = almacenDelNavegador()): Progreso {
  return interpretarProgreso(leerProgresoCrudo(almacen));
}

interface Opciones {
  readonly almacen?: Almacen | null;
  readonly objetivo?: Objetivo | null;
}

/**
 * Registra que se completó el quiz de un módulo con `aciertos` de `total`. Conserva el mejor
 * puntaje; si el quiz cambió de tamaño desde la última vez, el puntaje anterior ya no es
 * comparable y se reemplaza.
 *
 * Emite {@link EVENTO_PROGRESO} aunque no se haya podido guardar.
 */
export function registrarResultado(
  moduloId: string,
  aciertos: number,
  total: number,
  { almacen = almacenDelNavegador(), objetivo = objetivoDelNavegador() }: Opciones = {},
): DetalleProgreso {
  if (moduloId.trim() === '') throw new RangeError('El id del módulo no puede estar vacío.');
  if (!Number.isInteger(total) || total < 1) {
    throw new RangeError(`El quiz necesita al menos una pregunta (recibió ${total}).`);
  }
  if (!Number.isInteger(aciertos) || aciertos < 0 || aciertos > total) {
    throw new RangeError(`Los aciertos tienen que ir de 0 a ${total} (recibió ${aciertos}).`);
  }

  const anterior = leerProgreso(almacen);
  const previo = anterior.modulos[moduloId];
  const mejor = previo?.total === total ? Math.max(previo.mejor, aciertos) : aciertos;
  const progreso: Progreso = {
    modulos: { ...anterior.modulos, [moduloId]: { completado: true, mejor, total } },
  };

  let guardado = false;
  if (almacen) {
    try {
      almacen.setItem(
        CLAVE_PROGRESO,
        JSON.stringify({ version: VERSION_PROGRESO, modulos: progreso.modulos }),
      );
      guardado = true;
    } catch {
      // Sin espacio o almacenamiento bloqueado: el quiz sigue funcionando, solo no recuerda.
    }
  }

  const detalle: DetalleProgreso = { moduloId, progreso, guardado };
  objetivo?.dispatchEvent(new CustomEvent<DetalleProgreso>(EVENTO_PROGRESO, { detail: detalle }));
  return detalle;
}

/**
 * Borra todo el progreso guardado (pide confirmación quien la llama). Emite
 * {@link EVENTO_PROGRESO} con `moduloId: null`, aunque no se haya podido borrar.
 */
export function reiniciarProgreso({
  almacen = almacenDelNavegador(),
  objetivo = objetivoDelNavegador(),
}: Opciones = {}): DetalleProgreso {
  let guardado = false;
  if (almacen) {
    try {
      almacen.removeItem(CLAVE_PROGRESO);
      guardado = true;
    } catch {
      // Almacenamiento bloqueado: no había nada que recordar.
    }
  }

  const detalle: DetalleProgreso = { moduloId: null, progreso: PROGRESO_VACIO, guardado };
  objetivo?.dispatchEvent(new CustomEvent<DetalleProgreso>(EVENTO_PROGRESO, { detail: detalle }));
  return detalle;
}

/**
 * Llama a `alCambiar` cuando cambia el progreso: al registrar un resultado o reiniciar en esta
 * pestaña ({@link EVENTO_PROGRESO}) o en otra (evento `storage`). Devuelve la función que cancela la
 * suscripción. Sirve para `useSyncExternalStore`, junto con {@link leerProgresoCrudo}.
 */
export function suscribirProgreso(
  alCambiar: () => void,
  objetivo: Objetivo | null = objetivoDelNavegador(),
): () => void {
  if (!objetivo) return () => {};
  const alGuardarEnOtraPestana = (evento: Event) => {
    const clave = (evento as StorageEvent).key;
    // `key` es null cuando se borra todo el almacenamiento.
    if (clave === CLAVE_PROGRESO || clave === null) alCambiar();
  };
  objetivo.addEventListener(EVENTO_PROGRESO, alCambiar);
  objetivo.addEventListener('storage', alGuardarEnOtraPestana);
  return () => {
    objetivo.removeEventListener(EVENTO_PROGRESO, alCambiar);
    objetivo.removeEventListener('storage', alGuardarEnOtraPestana);
  };
}
