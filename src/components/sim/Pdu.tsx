/**
 * Una PDU dibujada en horizontal, parte por parte, en el orden en que viaja por el cable:
 * encabezados de afuera hacia adentro, datos y colas. El orden lo calcula el motor
 * (`partesEnElCable`); este componente no sabe qué agrega cada capa.
 *
 * - Cada parte lleva el color de su capa y, en texto, su nombre, el número y nombre de la
 *   capa (o que es una cola) y su tamaño, si se conoce. No depende solo del color.
 * - Arriba van el nombre de la PDU y, si se conoce, la longitud total.
 * - Con `desplazamientos`, cada parte dice también qué bytes ocupa.
 * - No tiene estado ni efectos: se puede usar en un MDX sin hidratar, como HTML estático.
 * - Con espacio (el propio contenedor mide al menos 36rem), las partes van en fila; más
 *   angosto, en una lista vertical, como `HeaderFormat`.
 */
import { partesVista, tituloPdu, type PduDibujada } from './pdu-vista';
import estilos from './Pdu.module.css';

interface Props {
  readonly paquete: PduDibujada;
  /** Muestra qué bytes ocupa cada parte. */
  readonly desplazamientos?: boolean;
}

const CLASE_PARTE = {
  encabezado: estilos.parte,
  cola: `${estilos.parte} ${estilos.cola}`,
  datos: `${estilos.parte} ${estilos.datos}`,
};

export default function Pdu({ paquete, desplazamientos = false }: Props) {
  const partes = partesVista(paquete);
  const { nombre, longitud } = tituloPdu(paquete);

  return (
    <figure className={estilos.pdu} data-pdu-vista>
      <figcaption className={estilos.cabecera}>
        <span className={estilos.titulo} data-pdu-nombre>
          {nombre}
        </span>
        {longitud !== undefined && <span className={estilos.meta}>{longitud}</span>}
      </figcaption>

      {partes.length === 0 ? (
        <p className={estilos.meta}>Sin partes</p>
      ) : (
        <ol className={estilos.partes} aria-label={`Partes de ${nombre}, en el orden del cable`}>
          {partes.map((parte, i) => (
            <li
              // Las partes no tienen id; su orden es fijo dentro de una PDU.
              key={i}
              className={CLASE_PARTE[parte.tipo]}
              data-parte={parte.tipo}
              data-capa={parte.capa}
            >
              <span className={estilos.nombre}>{parte.nombre}</span>
              <span className={estilos.detalle}>{parte.detalle}</span>
              {parte.tamano !== undefined && (
                <span className={estilos.tamano}>
                  {parte.tamano}
                  {desplazamientos && parte.rango !== undefined && ` · ${parte.rango}`}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </figure>
  );
}
