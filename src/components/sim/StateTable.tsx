/**
 * Instantánea de una tabla de estado (tabla MAC, ARP, de ruteo…) en el paso actual.
 *
 * Las filas nuevas o cambiadas se resaltan con color y además con una marca de texto, para
 * no depender solo del color. Qué filas están marcadas lo decide el motor; este componente
 * solo lo muestra.
 *
 * En pantallas chicas la tabla se desplaza en horizontal dentro de su propio contenedor,
 * que es enfocable para poder desplazarlo con el teclado.
 */
import { useId } from 'react';
import type { MarcaFila, TablaEstado } from '../../engine/core/timeline';
import estilos from './StateTable.module.css';

const TEXTO_MARCA: Record<MarcaFila, string> = {
  nueva: 'nueva',
  cambio: 'cambió',
};

interface Props {
  readonly tabla: TablaEstado;
}

export default function StateTable({ tabla }: Props) {
  const idTitulo = useId();

  return (
    <div
      className={estilos.desplazable}
      role="region"
      aria-labelledby={idTitulo}
      tabIndex={0}
      data-desplazable
    >
      <table className={estilos.tabla}>
        <caption id={idTitulo} className={estilos.titulo}>
          {tabla.titulo}
        </caption>
        <thead>
          <tr>
            {tabla.columnas.map((columna) => (
              <th key={columna} scope="col">
                {columna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tabla.filas.length === 0 ? (
            <tr>
              <td className={estilos.vacia} colSpan={tabla.columnas.length}>
                Sin entradas todavía.
              </td>
            </tr>
          ) : (
            tabla.filas.map((fila, i) => (
              <tr
                // Las filas no tienen id propio; su posición es estable dentro de un paso.
                key={i}
                className={fila.marca ? estilos.resaltada : undefined}
                data-marca={fila.marca}
              >
                {fila.celdas.map((celda, j) => (
                  <td key={j}>
                    {j === 0 && fila.marca && (
                      <span className={estilos.marca}>{TEXTO_MARCA[fila.marca]}</span>
                    )}
                    {celda}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
