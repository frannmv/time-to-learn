/**
 * Vista de pila de protocolos: el encapsulamiento visto en vertical, dentro de cada equipo.
 *
 * Una columna por nodo, en el orden de sus posiciones, con las capas que el escenario le da
 * (`Nodo.capas`). El medio físico une las columnas según los enlaces de la topología. Todo
 * viene del escenario y del `Step`: el componente no sabe qué capas tiene un router ni qué
 * agrega cada capa.
 *
 * - Cada capa lleva su color y, en texto, su número y su nombre.
 * - La capa donde está la PDU se marca con un borde grueso y una pestaña con el texto «PDU»,
 *   no solo con color. Si el paso no dice la capa, se marca el rótulo del equipo.
 * - Los bits en tránsito son una ficha sobre el tramo del medio, con su nombre y una flecha
 *   hacia donde van; el tramo pasa de punteado a sólido.
 * - Para lectores de pantalla, el SVG es una imagen con una descripción en texto de la pila
 *   de cada equipo y de dónde está la PDU (equipo, capa y nombre de la PDU).
 * - Movimiento (Web Animations API, mismo criterio que `Topology`): al avanzar un paso, la
 *   marca sube o baja de capa, o cruza el medio. Al retroceder, reiniciar o saltar, y con
 *   movimiento reducido, cambia de lugar sin desplazarse.
 * - El SVG escala con el ancho disponible hasta un mínimo legible; por debajo, el diagrama
 *   se desplaza en horizontal dentro de su contenedor, que es enfocable.
 */
import { useId, useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react';
import type { Paquete, Step, Timeline } from '../../engine/core/timeline';
import { describirPasoEnPila, describirPilas } from './descripcion';
import { NOMBRE_TIPO, type Caja, type Punto } from './geometria';
import {
  MEDIDAS_PILA as M,
  cajaPestana,
  centroDe,
  claveEnPila,
  geometriaPila,
  lineasCapa,
  marcaUbicacion,
  textoFicha,
  type GeometriaPila,
} from './geometria-pila';
import { desplazar } from './movimiento';
import estilos from './ProtocolStack.module.css';

interface Props {
  readonly timeline: Timeline;
  readonly paso: Step;
}

/** Caja relativa a su centro, para dibujar dentro de un grupo que se traslada. */
const relativa = (caja: Caja, centro: Punto) => ({
  x: caja.x - centro.x,
  y: caja.y - centro.y,
  width: caja.ancho,
  height: caja.alto,
});

/** La marca de una PDU: borde y pestaña «PDU» en una capa o un rótulo, o ficha en un enlace. */
function Marca({ paquete, geo }: { readonly paquete: Paquete; readonly geo: GeometriaPila }) {
  const marca = marcaUbicacion(paquete, geo);
  if (marca === undefined) return null;
  const centro = centroDe(marca.caja);

  return (
    <g
      transform={`translate(${centro.x} ${centro.y})`}
      data-marca={paquete.id}
      data-en={claveEnPila(paquete.ubicacion)}
    >
      {marca.tipo === 'enlace' ? (
        <>
          <rect className={estilos.ficha} {...relativa(marca.caja, centro)} rx={M.altoFicha / 2} />
          <text className={estilos.textoFicha} textAnchor="middle" dominantBaseline="central">
            {textoFicha(paquete, geo)}
          </text>
        </>
      ) : (
        <>
          <rect className={estilos.borde} {...relativa(marca.caja, centro)} />
          <rect className={estilos.pestana} {...relativa(cajaPestana(marca.caja), centro)} />
          <text
            className={estilos.textoPestana}
            x={marca.caja.ancho / 2 + M.anchoPestana / 2}
            textAnchor="middle"
            dominantBaseline="central"
          >
            PDU
          </text>
        </>
      )}
    </g>
  );
}

export default function ProtocolStack({ timeline, paso }: Props) {
  const idTitulo = useId();
  const idDescripcion = useId();
  const svg = useRef<SVGSVGElement>(null);
  const anterior = useRef<{ indice: number; posiciones: ReadonlyMap<string, Punto> } | null>(null);

  const geo = useMemo(() => geometriaPila(timeline), [timeline]);
  const posiciones = useMemo(
    () =>
      new Map(
        paso.paquetes.flatMap((p) => {
          const marca = marcaUbicacion(p, geo);
          return marca === undefined ? [] : [[p.id, centroDe(marca.caja)] as const];
        }),
      ),
    [paso, geo],
  );

  // Dónde hay una PDU en este paso: capas («a:3»), equipos sin capa («a») y enlaces.
  const ocupadas = new Set(paso.paquetes.map((p) => claveEnPila(p.ubicacion)));
  const enlacesActivos = new Set([
    ...paso.resaltados.enlaces,
    ...paso.paquetes.flatMap((p) => (p.ubicacion.tipo === 'enlace' ? [p.ubicacion.enlace] : [])),
  ]);

  // Antes de pintar: la marca ya está en su lugar nuevo y la animación la lleva desde el
  // anterior, así no se ve un salto.
  useLayoutEffect(() => {
    const previo = anterior.current;
    anterior.current = { indice: paso.indice, posiciones };
    if (svg.current !== null) desplazar(svg.current, 'marca', previo, anterior.current);
  }, [paso.indice, posiciones]);

  const { caja } = geo;
  const anchoDiagrama = { '--ancho-diagrama': caja.ancho } as CSSProperties;

  return (
    <div
      className={estilos.desplazable}
      role="region"
      aria-label="Diagrama de la pila de protocolos"
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
        <title id={idTitulo}>Pila de protocolos</title>
        <desc id={idDescripcion}>
          {describirPilas(geo.columnas.map((c) => c.nodo))}{' '}
          {describirPasoEnPila(paso, timeline.topologia)}
        </desc>

        <g>
          {geo.columnas.map((columna) => (
            <line
              key={columna.nodo.id}
              className={estilos.bajada}
              x1={columna.centro}
              y1={columna.base}
              x2={columna.centro}
              y2={geo.yMedio}
            />
          ))}
          {geo.tramos.map((tramo) => {
            const activo = enlacesActivos.has(tramo.enlace.id);
            return (
              <polyline
                key={tramo.enlace.id}
                className={activo ? estilos.medioActivo : estilos.medio}
                points={tramo.puntos.map((p) => `${p.x},${p.y}`).join(' ')}
                data-enlace={tramo.enlace.id}
                data-activo={activo || undefined}
              />
            );
          })}
        </g>

        {geo.columnas.map(({ nodo, rotulo, capas, centro }) => (
          <g key={nodo.id} data-nodo={nodo.id} data-actual={ocupadas.has(nodo.id) || undefined}>
            <text
              className={estilos.etiqueta}
              x={centro}
              y={rotulo.y + M.baseEtiqueta}
              textAnchor="middle"
            >
              {nodo.etiqueta}
            </text>
            <text className={estilos.tipo} x={centro} y={rotulo.y + M.baseTipo} textAnchor="middle">
              {NOMBRE_TIPO[nodo.tipo]}
            </text>
            {capas.map(({ capa, caja: c }) => {
              const [numero, nombre] = lineasCapa(capa);
              const actual = ocupadas.has(`${nodo.id}:${capa}`);
              return (
                <g
                  key={capa}
                  className={actual ? `${estilos.capa} ${estilos.actual}` : estilos.capa}
                  data-capa={capa}
                  data-actual={actual || undefined}
                >
                  <rect className={estilos.fondo} x={c.x} y={c.y} width={c.ancho} height={c.alto} />
                  <rect
                    className={estilos.franja}
                    x={c.x}
                    y={c.y}
                    width={M.franja}
                    height={c.alto}
                  />
                  <text
                    className={estilos.numero}
                    x={c.x + M.franja + M.relleno}
                    y={c.y + M.baseNumero}
                  >
                    {numero}
                  </text>
                  <text
                    className={estilos.nombre}
                    x={c.x + M.franja + M.relleno}
                    y={c.y + M.baseNombre}
                  >
                    {nombre}
                  </text>
                </g>
              );
            })}
          </g>
        ))}

        <g>
          {paso.paquetes.map((paquete) => (
            <Marca key={paquete.id} paquete={paquete} geo={geo} />
          ))}
        </g>
      </svg>
    </div>
  );
}
