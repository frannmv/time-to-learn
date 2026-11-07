/**
 * Isla de simulación (decisión transversal 3 de la Etapa 1). Es la única isla de React de
 * una simulación: recibe la línea de tiempo ya calculada por el motor y decide qué vistas
 * dibujar junto a los controles.
 *
 * No contiene lógica de protocolos: solo lee el `Step` actual.
 *
 * Teclado (decisión transversal 10): con el foco dentro de la simulación, ← y → cambian de
 * paso y espacio reproduce o pausa. Espacio sobre un botón conserva su comportamiento
 * normal (presiona ese botón), y las flechas dentro de una tabla o un diagrama desplazable
 * lo desplazan.
 */
import { useEffect, useId, useReducer, type KeyboardEvent } from 'react';
import type { Timeline } from '../../engine/core/timeline';
import StateTable from './StateTable';
import StepControls from './StepControls';
import Topology from './Topology';
import { crearEstado, stepper } from './stepper';
import estilos from './Simulation.module.css';

/** Vistas que la isla sabe dibujar: el diagrama de la topología y las tablas de estado. */
export type Vista = 'topologia' | 'tablas';

/** Tiempo que se muestra cada paso durante la reproducción automática. */
export const INTERVALO_REPRODUCCION_MS = 2000;

interface Props {
  readonly timeline: Timeline;
  /** Nombre accesible de la simulación (por ejemplo, «Simulación: aprendizaje de MAC»). */
  readonly titulo: string;
  readonly vistas?: readonly Vista[];
}

export default function Simulation({ timeline, titulo, vistas = ['topologia', 'tablas'] }: Props) {
  const [estado, despachar] = useReducer(stepper, timeline.pasos.length, crearEstado);
  const idAyuda = useId();
  const paso = timeline.pasos[estado.indice];

  useEffect(() => {
    if (!estado.reproduciendo) return;
    const temporizador = window.setTimeout(
      () => despachar({ tipo: 'tic' }),
      INTERVALO_REPRODUCCION_MS,
    );
    return () => window.clearTimeout(temporizador);
  }, [estado.reproduciendo, estado.indice]);

  function alPresionarTecla(evento: KeyboardEvent<HTMLElement>) {
    if (evento.altKey || evento.ctrlKey || evento.metaKey || evento.shiftKey) return;
    const destino = evento.target as HTMLElement;

    if (evento.key === 'ArrowLeft' || evento.key === 'ArrowRight') {
      if (destino.closest('[data-desplazable]')) return;
      evento.preventDefault();
      despachar({ tipo: evento.key === 'ArrowLeft' ? 'anterior' : 'siguiente' });
    } else if (evento.key === ' ') {
      if (destino.closest('button')) return;
      evento.preventDefault();
      despachar({ tipo: 'alternar' });
    }
  }

  if (paso === undefined) return null;

  return (
    // El contenedor es enfocable para que los atajos funcionen sin tener que ir a un botón.
    <section
      className={estilos.simulacion}
      aria-label={titulo}
      aria-describedby={idAyuda}
      tabIndex={0}
      onKeyDown={alPresionarTecla}
    >
      <StepControls estado={estado} alAccionar={despachar} />

      {vistas.includes('topologia') && <Topology timeline={timeline} paso={paso} />}

      <p className={estilos.explicacion} aria-live="polite" aria-atomic="true">
        {paso.explicacion}
      </p>

      {vistas.includes('tablas') && paso.tablas.length > 0 && (
        <div className={estilos.tablas}>
          {paso.tablas.map((tabla) => (
            <StateTable key={tabla.id} tabla={tabla} />
          ))}
        </div>
      )}

      <p id={idAyuda} className={estilos.ayuda}>
        Con el foco en la simulación: <kbd>←</kbd> y <kbd>→</kbd> cambian de paso;{' '}
        <kbd>espacio</kbd> reproduce o pausa.
      </p>
    </section>
  );
}
