/**
 * Un paquete dibujado como pila de encabezados dentro del SVG de la topología. Cada
 * encabezado lleva el color de su capa y, en texto, su nombre y el número y nombre de la
 * capa, así que no depende solo del color. La capa más alta queda arriba, como en el modelo
 * OSI; el encabezado de la capa más baja, que es el primero en el cable, queda abajo.
 *
 * Las colas van debajo de los encabezados, con borde punteado y la palabra «Cola» en su
 * texto. Si el paso le da nombre a la PDU, va en una fila arriba de todo. El orden de las
 * filas sale de `filasPaquete`, que usa el orden del cable que calcula el motor.
 *
 * Se dibuja apoyado en `posicion` (centro de su borde inferior). Dónde está lo dice el
 * `Step`; este componente no decide nada.
 */
import type { Paquete } from '../../engine/core/timeline';
import { MEDIDAS, claveUbicacion, filasPaquete, tamanoPaquete, type Punto } from './geometria';
import estilos from './Packet.module.css';

interface Props {
  readonly paquete: Paquete;
  readonly posicion: Punto;
}

export default function Packet({ paquete, posicion }: Props) {
  const { ancho, alto } = tamanoPaquete(paquete);
  const filas = filasPaquete(paquete);
  const xTexto = MEDIDAS.franja + MEDIDAS.relleno;
  const altoTitulo = paquete.pdu === undefined ? 0 : MEDIDAS.altoTitulo;

  return (
    <g
      className={estilos.paquete}
      transform={`translate(${posicion.x} ${posicion.y})`}
      data-paquete={paquete.id}
      data-ubicacion={claveUbicacion(paquete.ubicacion)}
    >
      {paquete.pdu !== undefined && (
        <g data-pdu transform={`translate(${-ancho / 2} ${-alto})`}>
          <rect className={estilos.titulo} width={ancho} height={altoTitulo} />
          <text className={estilos.pdu} x={xTexto} y={MEDIDAS.baseTitulo}>
            {paquete.pdu}
          </text>
        </g>
      )}
      {filas.map(({ capa, parte, lineas: [nombre, nombreCapa] }, i) => (
        <g
          // Los encabezados no tienen id; su orden es fijo dentro de un paquete.
          key={i}
          data-capa={capa}
          data-parte={parte}
          transform={`translate(${-ancho / 2} ${-alto + altoTitulo + i * MEDIDAS.altoFila})`}
        >
          <rect
            className={parte === 'cola' ? `${estilos.fondo} ${estilos.cola}` : estilos.fondo}
            width={ancho}
            height={MEDIDAS.altoFila}
          />
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
