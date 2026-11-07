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
 *
 * Varios escenarios (pieza 2.4, decisión transversal 5 de la Etapa 2): en lugar de una
 * `timeline`, la isla puede recibir `escenarios` ya calculados en el build y muestra un
 * grupo de radio para elegir uno. Dentro del grupo, las flechas y espacio conservan su
 * comportamiento nativo (cambian de escenario, no de paso). Cambiar de escenario vuelve al
 * paso 1, pausa y lo anuncia en la misma región `aria-live` que la explicación.
 */
import { useEffect, useId, useReducer, useState, type KeyboardEvent } from 'react';
import type { Timeline } from '../../engine/core/timeline';
import Pdu from './Pdu';
import ProtocolStack from './ProtocolStack';
import StateTable from './StateTable';
import StepControls from './StepControls';
import Topology from './Topology';
import { crearEstado, stepper } from './stepper';
import estilos from './Simulation.module.css';

/**
 * Vistas que la isla sabe dibujar: el diagrama de la topología, las tablas de estado y la
 * pila de protocolos (la pila de cada equipo y, debajo, la PDU del paso parte por parte).
 */
export type Vista = 'topologia' | 'tablas' | 'pila';

/** Tiempo que se muestra cada paso durante la reproducción automática. */
export const INTERVALO_REPRODUCCION_MS = 2000;

/** Un caso para comparar con la misma simulación, con su línea de tiempo ya calculada. */
export interface Escenario {
  /** Identificador único entre los escenarios de la simulación. */
  readonly id: string;
  /** Nombre que se muestra en el selector (por ejemplo, «Modelo OSI»). */
  readonly etiqueta: string;
  readonly timeline: Timeline;
}

interface PropsComunes {
  /** Nombre accesible de la simulación (por ejemplo, «Simulación: aprendizaje de MAC»). */
  readonly titulo: string;
  readonly vistas?: readonly Vista[];
}

/** Una sola línea de tiempo, o al menos dos escenarios para elegir: nunca las dos cosas. */
type Props = PropsComunes &
  (
    | { readonly timeline: Timeline; readonly escenarios?: never }
    | {
        readonly escenarios: readonly [Escenario, Escenario, ...Escenario[]];
        readonly timeline?: never;
      }
  );

export default function Simulation(props: Props) {
  const { titulo, vistas = ['topologia', 'tablas'] } = props;
  const escenarios = props.escenarios;
  if (escenarios !== undefined && new Set(escenarios.map((e) => e.id)).size !== escenarios.length) {
    throw new Error(`Los escenarios de «${titulo}» repiten un id.`);
  }

  const [idEscenario, setIdEscenario] = useState(escenarios?.[0].id);
  const escenario = escenarios?.find((e) => e.id === idEscenario) ?? escenarios?.[0];
  const timeline = escenario?.timeline ?? props.timeline;
  if (timeline === undefined) throw new Error(`La simulación «${titulo}» no tiene timeline.`);

  const [estado, despachar] = useReducer(stepper, timeline.pasos.length, crearEstado);
  // Se anuncia el escenario junto con la explicación del paso 1, hasta que se cambie de paso.
  const [anunciarEscenario, setAnunciarEscenario] = useState(false);
  const idAyuda = useId();
  const nombreGrupo = useId();
  const paso = timeline.pasos[estado.indice];

  // Al salir del paso 1 deja de anunciarse (se ajusta durante el render, sin un efecto).
  if (anunciarEscenario && estado.indice !== 0) setAnunciarEscenario(false);

  useEffect(() => {
    if (!estado.reproduciendo) return;
    const temporizador = window.setTimeout(
      () => despachar({ tipo: 'tic' }),
      INTERVALO_REPRODUCCION_MS,
    );
    return () => window.clearTimeout(temporizador);
  }, [estado.reproduciendo, estado.indice]);

  function elegirEscenario(nuevo: Escenario) {
    setIdEscenario(nuevo.id);
    despachar({ tipo: 'cargar', total: nuevo.timeline.pasos.length });
    setAnunciarEscenario(true);
  }

  function alPresionarTecla(evento: KeyboardEvent<HTMLElement>) {
    if (evento.altKey || evento.ctrlKey || evento.metaKey || evento.shiftKey) return;
    const destino = evento.target as HTMLElement;
    // En el selector de escenarios, las flechas y espacio hacen lo de siempre en un radio.
    if (destino.closest('[data-selector-escenario]')) return;

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
      {escenarios !== undefined && escenario !== undefined && (
        <fieldset className={estilos.escenarios} data-selector-escenario>
          <legend>Escenario</legend>
          <div className={estilos.opciones}>
            {escenarios.map((e) => (
              <label key={e.id} className={estilos.opcion}>
                <input
                  type="radio"
                  name={nombreGrupo}
                  value={e.id}
                  checked={e.id === escenario.id}
                  onChange={() => elegirEscenario(e)}
                />
                {e.etiqueta}
              </label>
            ))}
          </div>
          {/* El escenario elegido también se lee en texto, no solo por el radio marcado. */}
          <p className={estilos.actual} data-testid="escenario-actual">
            Mostrando: <strong>{escenario.etiqueta}</strong>
          </p>
        </fieldset>
      )}

      <StepControls estado={estado} alAccionar={despachar} />

      {/* La key reinicia el diagrama al cambiar de escenario: así no anima desde el anterior. */}
      {vistas.includes('topologia') && (
        <Topology key={escenario?.id} timeline={timeline} paso={paso} />
      )}
      {vistas.includes('pila') && (
        <ProtocolStack key={escenario?.id} timeline={timeline} paso={paso} />
      )}

      <p className={estilos.explicacion} aria-live="polite" aria-atomic="true">
        {anunciarEscenario && escenario !== undefined && (
          <span className="solo-lector">
            Escenario «{escenario.etiqueta}», paso 1 de {estado.total}.{' '}
          </span>
        )}
        {paso.explicacion}
      </p>

      {vistas.includes('pila') &&
        paso.paquetes.map((paquete) => <Pdu key={paquete.id} paquete={paquete} />)}

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
