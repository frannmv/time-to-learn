/**
 * Estado de navegación de una simulación: en qué paso está y si se reproduce sola.
 *
 * Es estado de la interfaz, no lógica de protocolo: no sabe nada de lo que pasa en cada
 * paso, solo mueve un índice entre 0 y `total - 1`. Es un reducer puro para poder probarlo
 * sin React.
 */

export interface EstadoStepper {
  /** Paso actual, desde 0. */
  readonly indice: number;
  /** Cantidad de pasos de la línea de tiempo (al menos 1). */
  readonly total: number;
  readonly reproduciendo: boolean;
}

export type AccionStepper =
  /** Navegación manual: retrocede un paso y pausa. */
  | { readonly tipo: 'anterior' }
  /** Navegación manual: avanza un paso y pausa. */
  | { readonly tipo: 'siguiente' }
  /** Vuelve al paso 0 y pausa. */
  | { readonly tipo: 'reiniciar' }
  /** Empieza a reproducir. En el último paso, vuelve al 0 y reproduce desde ahí. */
  | { readonly tipo: 'reproducir' }
  | { readonly tipo: 'pausar' }
  /** Reproduce si está en pausa y pausa si se está reproduciendo. */
  | { readonly tipo: 'alternar' }
  /** Avance automático durante la reproducción. Al llegar al final, se detiene. */
  | { readonly tipo: 'tic' }
  /**
   * Empieza de nuevo con otra línea de tiempo (por ejemplo, al elegir otro escenario):
   * vuelve al paso 0 con la nueva cantidad de pasos y pausa.
   */
  | { readonly tipo: 'cargar'; readonly total: number };

export function crearEstado(total: number): EstadoStepper {
  if (!Number.isInteger(total) || total < 1) {
    throw new RangeError(`La simulación necesita al menos un paso (recibió ${total}).`);
  }
  return { indice: 0, total, reproduciendo: false };
}

export const esPrimero = (estado: EstadoStepper): boolean => estado.indice === 0;

export const esUltimo = (estado: EstadoStepper): boolean => estado.indice === estado.total - 1;

/** Devuelve el mismo objeto si nada cambia, así React no vuelve a dibujar de más. */
function con(estado: EstadoStepper, indice: number, reproduciendo: boolean): EstadoStepper {
  if (estado.indice === indice && estado.reproduciendo === reproduciendo) return estado;
  return { ...estado, indice, reproduciendo };
}

export function stepper(estado: EstadoStepper, accion: AccionStepper): EstadoStepper {
  const ultimo = estado.total - 1;
  switch (accion.tipo) {
    case 'anterior':
      return con(estado, Math.max(estado.indice - 1, 0), false);
    case 'siguiente':
      return con(estado, Math.min(estado.indice + 1, ultimo), false);
    case 'reiniciar':
      return con(estado, 0, false);
    case 'reproducir':
      // Con un solo paso no hay nada que reproducir.
      if (ultimo === 0) return con(estado, 0, false);
      return con(estado, esUltimo(estado) ? 0 : estado.indice, true);
    case 'pausar':
      return con(estado, estado.indice, false);
    case 'alternar':
      return stepper(estado, { tipo: estado.reproduciendo ? 'pausar' : 'reproducir' });
    case 'tic': {
      if (!estado.reproduciendo) return estado;
      const indice = Math.min(estado.indice + 1, ultimo);
      return con(estado, indice, indice < ultimo);
    }
    case 'cargar':
      return crearEstado(accion.total);
  }
}
