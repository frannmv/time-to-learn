/**
 * Indicador de progreso TTL (pieza 1.9): cada módulo completado es un salto más en el recorrido.
 *
 * Muestra «3 de 12 saltos» sobre los módulos que recibe (los visibles) y una ruta de puntos, uno
 * por módulo, con el color de su capa. Los completados se rellenan y los pendientes quedan solo
 * con borde: la diferencia es de forma, no solo de color, y un texto para lectores de pantalla
 * dice cuáles están completados. Los puntos en sí no se anuncian.
 *
 * Se actualiza sin recargar cuando el Quiz registra un resultado, cuando se reinicia el progreso
 * o cuando cambia en otra pestaña (`suscribirProgreso`). En el servidor se dibuja sin progreso
 * (0 saltos) y al hidratarse lee el del navegador; si el almacenamiento está bloqueado, queda en 0.
 *
 * Sin módulos muestra un estado vacío, sin «0 de 0». Ese estado no necesita JavaScript: el
 * encabezado lo dibuja sin directiva `client:`.
 *
 * Con `conReinicio` agrega el botón «Reiniciar progreso», que pide confirmación en la misma
 * página. Al abrirla, el foco va a «Cancelar» (la opción segura); Escape también cancela; al
 * cerrarla, el foco vuelve al botón.
 */
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  interpretarProgreso,
  leerProgresoCrudo,
  reiniciarProgreso,
  suscribirProgreso,
} from '../../lib/progreso';
import {
  resumirRecorrido,
  textoCompletados,
  textoSaltos,
  type ModuloRecorrido,
} from '../../lib/recorrido';
import estilos from './TtlProgress.module.css';

interface Props {
  /** Módulos visibles, en el orden del recorrido. */
  readonly modulos: readonly ModuloRecorrido[];
  /** Muestra el botón «Reiniciar progreso». */
  readonly conReinicio?: boolean;
}

/** Qué dice la región de estado después de reiniciar (o nada). */
type Aviso = 'reiniciado' | 'sin-almacenamiento' | null;

// En el servidor no hay almacenamiento: se dibuja como si no hubiera progreso.
const sinProgresoEnServidor = () => null;

export default function TtlProgress({ modulos, conReinicio = false }: Props) {
  const crudo = useSyncExternalStore(suscribirProgreso, leerProgresoCrudo, sinProgresoEnServidor);
  const recorrido = useMemo(
    () => resumirRecorrido(modulos, interpretarProgreso(crudo)),
    [modulos, crudo],
  );
  const saltos = textoSaltos(recorrido);

  if (saltos === null) {
    return (
      <div className={estilos.indicador} data-ttl-progreso="vacio">
        <p className={estilos.vacio}>
          <span className="solo-lector">Progreso TTL: </span>
          Todavía no hay módulos para recorrer.
        </p>
      </div>
    );
  }

  return (
    <div
      className={estilos.indicador}
      data-ttl-progreso
      data-hechos={recorrido.hechos}
      data-total={recorrido.total}
    >
      <p className={estilos.cuenta} data-testid="ttl-saltos">
        <span className="solo-lector">Progreso TTL: </span>
        {saltos}
      </p>
      <p className="solo-lector" data-testid="ttl-completados">
        {textoCompletados(recorrido)}
      </p>
      <ol className={estilos.ruta} aria-hidden="true">
        {recorrido.pasos.map(({ modulo, completado }) => (
          <li
            key={modulo.id}
            className={estilos.punto}
            data-capa={modulo.capa}
            data-completado={completado}
            title={`${modulo.titulo}: ${completado ? 'completado' : 'pendiente'}`}
          />
        ))}
      </ol>
      {conReinicio && <Reinicio />}
    </div>
  );
}

function Reinicio() {
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);
  const id = useId();
  const boton = useRef<HTMLButtonElement>(null);
  const cancelar = useRef<HTMLButtonElement>(null);
  // Adónde mover el foco después del próximo dibujo.
  const focoPendiente = useRef<'boton' | 'cancelar' | null>(null);

  useEffect(() => {
    const foco = focoPendiente.current;
    if (!foco) return;
    focoPendiente.current = null;
    (foco === 'boton' ? boton : cancelar).current?.focus();
  });

  function abrir() {
    setAviso(null);
    setConfirmando(true);
    focoPendiente.current = 'cancelar';
  }

  function cerrar() {
    setConfirmando(false);
    focoPendiente.current = 'boton';
  }

  function confirmar() {
    const { guardado } = reiniciarProgreso();
    setAviso(guardado ? 'reiniciado' : 'sin-almacenamiento');
    cerrar();
  }

  return (
    <div className={estilos.reinicio}>
      {confirmando ? (
        <div
          role="group"
          aria-labelledby={`${id}-pregunta`}
          className={estilos.confirmacion}
          onKeyDown={(evento) => {
            if (evento.key === 'Escape') cerrar();
          }}
        >
          <p id={`${id}-pregunta`}>
            ¿Borrar el progreso de todos los módulos en este navegador? No se puede deshacer.
          </p>
          <div className={estilos.acciones}>
            <button type="button" className={estilos.boton} onClick={confirmar}>
              Sí, reiniciar
            </button>
            <button type="button" ref={cancelar} className={estilos.boton} onClick={cerrar}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" ref={boton} className={estilos.boton} onClick={abrir}>
          Reiniciar progreso
        </button>
      )}

      {/* La región de estado existe desde el principio para que el aviso se anuncie. */}
      <p role="status" className={estilos.aviso}>
        {aviso === 'reiniciado' && 'Progreso reiniciado: el recorrido vuelve a 0 saltos.'}
        {aviso === 'sin-almacenamiento' &&
          'Este navegador no permite guardar el progreso: no había nada que borrar.'}
      </p>
    </div>
  );
}
