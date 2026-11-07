/**
 * Un paquete dibujado como pila de encabezados dentro del SVG de la topología. Cada
 * encabezado lleva el color de su capa y, en texto, su nombre y el número y nombre de la
 * capa, así que no depende solo del color. La capa más alta queda arriba, como en el modelo
 * OSI; el encabezado de la capa más baja, que es el primero en el cable, queda abajo.
 *
 * Se dibuja apoyado en `posicion` (centro de su borde inferior). Dónde está lo dice el
 * `Step`; este componente no decide nada.
 */
import type { Paquete } from '../../engine/core/timeline';
import {
  MEDIDAS,
  TEXTO_SIN_ENCABEZADOS,
  claveUbicacion,
  lineasEncabezado,
  tamanoPaquete,
  type Punto,
} from './geometria';
import estilos from './Packet.module.css';

interface Props {
  readonly paquete: Paquete;
  readonly posicion: Punto;
}

export default function Packet({ paquete, posicion }: Props) {
  const { ancho, alto } = tamanoPaquete(paquete.encabezados);
  const filas =
    paquete.encabezados.length > 0
      ? [...paquete.encabezados]
          .reverse()
          .map((e) => ({ capa: e.capa, lineas: lineasEncabezado(e) }))
      : [{ capa: undefined, lineas: [TEXTO_SIN_ENCABEZADOS, ''] as const }];
  const xTexto = MEDIDAS.franja + MEDIDAS.relleno;

  return (
    <g
      className={estilos.paquete}
      transform={`translate(${posicion.x} ${posicion.y})`}
      data-paquete={paquete.id}
      data-ubicacion={claveUbicacion(paquete.ubicacion)}
    >
      {filas.map(({ capa, lineas: [nombre, nombreCapa] }, i) => (
        <g
          // Los encabezados no tienen id; su orden es fijo dentro de un paquete.
          key={i}
          data-capa={capa}
          transform={`translate(${-ancho / 2} ${-alto + i * MEDIDAS.altoFila})`}
        >
          <rect className={estilos.fondo} width={ancho} height={MEDIDAS.altoFila} />
          <rect className={estilos.franja} width={MEDIDAS.franja} height={MEDIDAS.altoFila} />
          <text className={estilos.nombre} x={xTexto} y={MEDIDAS.baseNombre}>
            {nombre}
          </text>
          {nombreCapa !== '' && (
            <text className={estilos.capa} x={xTexto} y={MEDIDAS.baseCapa}>
              {nombreCapa}
            </text>
          )}
        </g>
      ))}
    </g>
  );
}
