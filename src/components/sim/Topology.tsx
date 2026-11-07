/**
 * Diagrama de la topología en el paso actual: nodos, enlaces y paquetes, en SVG.
 *
 * Todo lo que dibuja viene del escenario y del `Step`: las posiciones de los nodos, qué
 * está resaltado y dónde está cada paquete. No calcula rutas ni decide nada.
 *
 * - Cada tipo de nodo tiene su forma, y además su etiqueta y su tipo en texto.
 * - Lo resaltado no depende solo del color: el nodo lleva un anillo y un trazo más grueso;
 *   el enlace pasa de punteado a sólido y más grueso.
 * - Para lectores de pantalla, el SVG es una imagen con una descripción en texto de la
 *   topología y de dónde está cada paquete.
 * - Movimiento (Web Animations API): al avanzar un paso, el paquete se desplaza desde donde
 *   estaba. Al retroceder, reiniciar o saltar, y con movimiento reducido, cambia de lugar
 *   sin desplazarse.
 * - El SVG escala con el ancho disponible hasta un mínimo legible; por debajo, el diagrama
 *   se desplaza en horizontal dentro de su contenedor, que es enfocable.
 */
import { useId, useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react';
import type { Nodo, Step, TipoNodo, Timeline } from '../../engine/core/timeline';
import { describirPaso, describirTopologia } from './descripcion';
import {
  MEDIDAS,
  NOMBRE_TIPO,
  calcularCaja,
  duracionEnMs,
  esAvanceDeUnPaso,
  posicionPaquete,
  posicionesNodos,
  type Punto,
} from './geometria';
import Packet from './Packet';
import estilos from './Topology.module.css';

interface Props {
  readonly timeline: Timeline;
  readonly paso: Step;
}

/** Forma de cada tipo de nodo, centrada en (0, 0) y dentro de ±MEDIDAS.radioNodo. */
function FormaNodo({ tipo }: { readonly tipo: TipoNodo }) {
  switch (tipo) {
    case 'host':
      // Monitor con su pie.
      return (
        <>
          <rect className={estilos.forma} x={-20} y={-18} width={40} height={30} rx={4} />
          <path className={estilos.glifo} d="M 0 12 V 19 M -10 19 H 10" />
        </>
      );
    case 'switch':
      // Caja con dos flechas en sentidos opuestos.
      return (
        <>
          <rect className={estilos.forma} x={-22} y={-16} width={44} height={32} rx={2} />
          <path
            className={estilos.glifo}
            d="M -12 -5 H 12 M 7 -10 L 12 -5 L 7 0 M 12 5 H -12 M -7 0 L -12 5 L -7 10"
          />
        </>
      );
    case 'router':
      // Círculo con una cruz de flechas.
      return (
        <>
          <circle className={estilos.forma} r={22} />
          <path
            className={estilos.glifo}
            d="M -12 0 H 12 M 0 -12 V 12 M 8 -4 L 12 0 L 8 4 M -8 -4 L -12 0 L -8 4 M -4 -8 L 0 -12 L 4 -8 M -4 8 L 0 12 L 4 8"
          />
        </>
      );
    case 'hub':
      // Caja ancha y baja con sus puertos.
      return (
        <>
          <rect className={estilos.forma} x={-24} y={-10} width={48} height={20} rx={2} />
          <path className={estilos.glifo} d="M -12 -4 V 4 M -4 -4 V 4 M 4 -4 V 4 M 12 -4 V 4" />
        </>
      );
    case 'ap':
      // Círculo con arcos de señal.
      return (
        <>
          <circle className={estilos.forma} r={22} />
          <path
            className={estilos.glifo}
            d="M -7 2 A 10 10 0 0 1 7 2 M -13 -4 A 18 18 0 0 1 13 -4"
          />
          <circle className={estilos.punto} cy={9} r={3} />
        </>
      );
  }
}

function DibujoNodo({ nodo, resaltado }: { readonly nodo: Nodo; readonly resaltado: boolean }) {
  const r = MEDIDAS.radioAnillo;
  return (
    <g
      className={resaltado ? `${estilos.nodo} ${estilos.resaltado}` : estilos.nodo}
      transform={`translate(${nodo.posicion.x} ${nodo.posicion.y})`}
      data-nodo={nodo.id}
      data-tipo={nodo.tipo}
      data-resaltado={resaltado || undefined}
    >
      {resaltado && (
        <rect className={estilos.anillo} x={-r} y={-r} width={2 * r} height={2 * r} rx={12} />
      )}
      <FormaNodo tipo={nodo.tipo} />
      <text className={estilos.etiqueta} y={MEDIDAS.baseEtiqueta} textAnchor="middle">
        {nodo.etiqueta}
      </text>
      <text className={estilos.tipo} y={MEDIDAS.baseTipo} textAnchor="middle">
        {NOMBRE_TIPO[nodo.tipo]}
      </text>
    </g>
  );
}

/** Lee la duración y la curva de los tokens (con movimiento reducido, la duración es 0). */
function leerMovimiento(elemento: Element): { duracion: number; curva: string } {
  const estilo = getComputedStyle(elemento);
  return {
    duracion: duracionEnMs(estilo.getPropertyValue('--duracion-lenta')),
    curva: estilo.getPropertyValue('--curva-estandar').trim() || 'ease',
  };
}

const iguales = (a: Punto, b: Punto) => a.x === b.x && a.y === b.y;

export default function Topology({ timeline, paso }: Props) {
  const idTitulo = useId();
  const idDescripcion = useId();
  const svg = useRef<SVGSVGElement>(null);
  const anterior = useRef<{ indice: number; posiciones: ReadonlyMap<string, Punto> } | null>(null);

  const { topologia } = timeline;
  const caja = useMemo(() => calcularCaja(timeline), [timeline]);
  const nodos = useMemo(() => posicionesNodos(timeline), [timeline]);
  const posiciones = useMemo(
    () => new Map(paso.paquetes.map((p) => [p.id, posicionPaquete(p.ubicacion, nodos)])),
    [paso, nodos],
  );
  const nodosResaltados = new Set(paso.resaltados.nodos);
  const enlacesResaltados = new Set(paso.resaltados.enlaces);

  // Antes de pintar: el paquete ya está dibujado en su lugar nuevo y la animación lo lleva
  // desde el anterior, así no se ve un salto.
  useLayoutEffect(() => {
    const previo = anterior.current;
    anterior.current = { indice: paso.indice, posiciones };
    const raiz = svg.current;
    if (raiz === null) return;

    for (const animacion of raiz.getAnimations({ subtree: true })) animacion.cancel();
    if (previo === null || !esAvanceDeUnPaso(previo.indice, paso.indice)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const { duracion, curva } = leerMovimiento(raiz);
    if (duracion <= 0) return;

    for (const elemento of raiz.querySelectorAll<SVGGElement>('[data-paquete]')) {
      const id = elemento.dataset.paquete ?? '';
      const desde = previo.posiciones.get(id);
      const hasta = posiciones.get(id);
      // Un paquete que recién aparece no viene de ningún lado: se muestra sin moverse.
      if (desde === undefined || hasta === undefined || iguales(desde, hasta)) continue;
      elemento.animate(
        [
          { transform: `translate(${desde.x}px, ${desde.y}px)` },
          { transform: `translate(${hasta.x}px, ${hasta.y}px)` },
        ],
        { duration: duracion, easing: curva },
      );
    }
  }, [paso.indice, posiciones]);

  // El ancho del viewBox llega al CSS para calcular el ancho mínimo legible.
  const anchoDiagrama = { '--ancho-diagrama': caja.ancho } as CSSProperties;

  return (
    <div
      className={estilos.desplazable}
      role="region"
      aria-label="Diagrama de la topología"
      tabIndex={0}
      data-desplazable
    >
      <svg
        ref={svg}
        className={estilos.diagrama}
        style={anchoDiagrama}
        viewBox={`${caja.x} ${caja.y} ${caja.ancho} ${caja.alto}`}
        width={caja.ancho}
        height={caja.alto}
        role="img"
        aria-labelledby={idTitulo}
        aria-describedby={idDescripcion}
      >
        <title id={idTitulo}>Topología</title>
        <desc id={idDescripcion}>
          {describirTopologia(topologia)} {describirPaso(paso, topologia)}
        </desc>

        <g>
          {topologia.enlaces.map((enlace) => {
            const [a, b] = enlace.extremos.map((id) => nodos.get(id));
            if (a === undefined || b === undefined) return null;
            const resaltado = enlacesResaltados.has(enlace.id);
            return (
              <line
                key={enlace.id}
                className={resaltado ? estilos.enlaceResaltado : estilos.enlace}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                data-enlace={enlace.id}
                data-resaltado={resaltado || undefined}
              />
            );
          })}
        </g>

        <g>
          {topologia.nodos.map((nodo) => (
            <DibujoNodo key={nodo.id} nodo={nodo} resaltado={nodosResaltados.has(nodo.id)} />
          ))}
        </g>

        <g>
          {paso.paquetes.map((paquete) => {
            const posicion = posiciones.get(paquete.id);
            if (posicion === undefined) return null;
            return <Packet key={paquete.id} paquete={paquete} posicion={posicion} />;
          })}
        </g>
      </svg>
    </div>
  );
}
