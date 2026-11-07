/**
 * Quiz de repaso de un módulo (plantilla de módulo, LINEAMIENTOS §6): preguntas de opción
 * múltiple con una respuesta correcta y la explicación de cada una.
 *
 * Accesibilidad:
 * - Cada pregunta es un `<fieldset>` con radios nativos: Tab entra al grupo y las flechas
 *   cambian la opción. Elegir no corrige; corrige el botón «Comprobar».
 * - El resultado se dice en texto («Correcta», «Incorrecta», «(respuesta correcta)»), no solo
 *   con color ni con íconos.
 * - Al comprobar, el foco pasa a la explicación (así el lector de pantalla la lee y el foco no
 *   se pierde cuando el botón desaparece). Al reintentar, vuelve a la primera opción.
 *
 * Al terminar registra el resultado con `src/lib/progreso.ts`. Si el navegador no deja
 * guardar, el quiz funciona igual y solo avisa que no va a recordar el resultado.
 */
import {
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  interpretarProgreso,
  leerProgresoCrudo,
  registrarResultado,
  suscribirProgreso,
} from '../../lib/progreso';
import {
  aciertos,
  crearEstadoQuiz,
  esCorrecta,
  quiz,
  terminado,
  type AccionQuiz,
} from './estado-quiz';
import estilos from './Quiz.module.css';

export interface PreguntaQuiz {
  readonly pregunta: string;
  readonly opciones: readonly string[];
  /** Índice (desde 0) de la opción correcta. */
  readonly correcta: number;
  readonly explicacion: string;
}

interface Props {
  /** Id del módulo: con él se guarda el progreso. */
  readonly moduloId: string;
  readonly preguntas: readonly PreguntaQuiz[];
}

/** Adónde mover el foco después del próximo dibujo. */
type Foco =
  { readonly tipo: 'explicacion'; readonly pregunta: number } | { readonly tipo: 'inicio' };

// En el servidor no hay almacenamiento: el quiz se dibuja como si no hubiera progreso.
const sinProgresoEnServidor = () => null;

export default function Quiz({ moduloId, preguntas }: Props) {
  const [estado, despachar] = useReducer(
    quiz,
    preguntas.map((p) => p.correcta),
    crearEstadoQuiz,
  );
  const [sinGuardar, setSinGuardar] = useState(false);
  const id = useId();

  const crudo = useSyncExternalStore(suscribirProgreso, leerProgresoCrudo, sinProgresoEnServidor);
  const guardado = useMemo(() => {
    const resultado = interpretarProgreso(crudo).modulos[moduloId];
    // Si el quiz cambió de tamaño, el puntaje guardado ya no es comparable.
    return resultado?.total === preguntas.length ? resultado : undefined;
  }, [crudo, moduloId, preguntas.length]);

  const explicaciones = useRef<(HTMLDivElement | null)[]>([]);
  const primeraOpcion = useRef<HTMLInputElement>(null);
  const focoPendiente = useRef<Foco | null>(null);

  useEffect(() => {
    const foco = focoPendiente.current;
    if (!foco) return;
    focoPendiente.current = null;
    if (foco.tipo === 'inicio') primeraOpcion.current?.focus();
    else explicaciones.current[foco.pregunta]?.focus();
  });

  function comprobar(pregunta: number) {
    const accion: AccionQuiz = { tipo: 'comprobar', pregunta };
    const siguiente = quiz(estado, accion);
    if (siguiente === estado) return;
    despachar(accion);
    focoPendiente.current = { tipo: 'explicacion', pregunta };
    if (terminado(siguiente)) {
      const { guardado } = registrarResultado(moduloId, aciertos(siguiente), preguntas.length);
      setSinGuardar(!guardado);
    }
  }

  function reintentar() {
    despachar({ tipo: 'reintentar' });
    setSinGuardar(false);
    focoPendiente.current = { tipo: 'inicio' };
  }

  const fin = terminado(estado);
  const total = preguntas.length;

  return (
    <div className={estilos.quiz}>
      {guardado && !fin && (
        <p className={estilos.previo} data-testid="quiz-previo">
          Ya completaste este quiz. Tu mejor puntaje: {guardado.mejor} de {total}.
        </p>
      )}

      {preguntas.map((p, i) => {
        const elegida = estado.elegidas[i] ?? null;
        const comprobada = estado.comprobadas[i] === true;
        const bien = esCorrecta(estado, i);
        return (
          <fieldset key={i} className={estilos.pregunta}>
            <legend className={estilos.enunciado}>
              <span className={estilos.numero}>
                Pregunta {i + 1} de {total}
              </span>{' '}
              {p.pregunta}
            </legend>

            <div className={estilos.opciones}>
              {p.opciones.map((opcion, j) => {
                const esLaCorrecta = comprobada && j === p.correcta;
                const esElErrorElegido = comprobada && j === elegida && j !== p.correcta;
                return (
                  <label
                    key={j}
                    className={estilos.opcion}
                    data-estado={
                      esLaCorrecta ? 'correcta' : esElErrorElegido ? 'incorrecta' : undefined
                    }
                  >
                    <input
                      ref={i === 0 && j === 0 ? primeraOpcion : undefined}
                      type="radio"
                      name={`${id}-pregunta-${i}`}
                      value={j}
                      checked={elegida === j}
                      disabled={comprobada}
                      onChange={() => despachar({ tipo: 'elegir', pregunta: i, opcion: j })}
                    />
                    <span>
                      {opcion}
                      {esLaCorrecta && (
                        <strong className={estilos.marca}> (respuesta correcta)</strong>
                      )}
                      {esElErrorElegido && (
                        <strong className={estilos.marca}> (tu respuesta)</strong>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>

            {comprobada ? (
              <div
                ref={(nodo) => {
                  explicaciones.current[i] = nodo;
                }}
                tabIndex={-1}
                className={estilos.devolucion}
                data-resultado={bien ? 'correcta' : 'incorrecta'}
              >
                <p className={estilos.veredicto}>
                  <span aria-hidden="true">{bien ? '✓' : '✗'}</span>{' '}
                  {bien ? 'Correcta.' : 'Incorrecta.'}
                </p>
                <p>{p.explicacion}</p>
              </div>
            ) : (
              <button
                type="button"
                className={estilos.boton}
                aria-disabled={elegida === null}
                onClick={() => comprobar(i)}
              >
                Comprobar
              </button>
            )}
          </fieldset>
        );
      })}

      {/* La región de estado existe desde el principio para que el resultado se anuncie. */}
      <div role="status">
        {fin && (
          <div className={estilos.resultado}>
            <p className={estilos.puntaje}>
              Resultado: {aciertos(estado)} de {total}
            </p>
            {guardado && (
              <p>
                Tu mejor puntaje: {guardado.mejor} de {total}.
              </p>
            )}
            {sinGuardar && (
              <p className={estilos.atenuado}>
                Este navegador no permite guardar el progreso: el resultado no se va a recordar.
              </p>
            )}
          </div>
        )}
      </div>

      {fin && (
        <button type="button" className={estilos.boton} onClick={reintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}
