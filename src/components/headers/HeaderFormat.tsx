/**
 * Formato de un encabezado: dibuja cualquier `HeaderSpec` del motor. No conoce ningún
 * protocolo.
 *
 * - Con espacio (el propio contenedor mide al menos 36rem), rejilla de 32 bits por fila
 *   como en los diagramas de los RFC, con el ancho de cada campo proporcional a sus bits.
 * - En pantallas angostas, lista de campos con nombre, tamaño y valor.
 *
 * Cada campo es un botón: al enfocarlo o elegirlo, su descripción aparece en un panel que
 * se anuncia a los lectores de pantalla. El selector de formato muestra todos los valores
 * en hexadecimal, binario o decimal, o cada uno en su formato propio, con las utilidades de
 * formato del motor.
 */
import { useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { NOMBRE_CAPA } from '../../engine/core/capas';
import {
  desplazamientos,
  formatearValor,
  longitudEnBytes,
  type CampoSpec,
  type FormatoNumerico,
  type HeaderSpec,
} from '../../engine/core/header';
import { BITS_POR_FILA, calcularTramos } from './tramos';
import estilos from './HeaderFormat.module.css';

/** «Por campo» respeta el formato de cada campo; el resto los muestra todos igual. */
export type FormatoVista = 'campo' | FormatoNumerico;

const OPCIONES: readonly { valor: FormatoVista; etiqueta: string }[] = [
  { valor: 'campo', etiqueta: 'Por campo' },
  { valor: 'hex', etiqueta: 'Hexadecimal' },
  { valor: 'binario', etiqueta: 'Binario' },
  { valor: 'decimal', etiqueta: 'Decimal' },
];

/** Bits que se numeran en la regla de la rejilla: el comienzo de cada byte. */
const MARCAS_REGLA = Array.from({ length: BITS_POR_FILA / 8 }, (_, i) => i * 8);

interface Props {
  readonly encabezado: HeaderSpec;
}

function valorEn(campo: CampoSpec, formato: FormatoVista): string {
  return formatearValor(campo, formato === 'campo' ? campo.formato : formato);
}

/** Une clases de CSS Modules, que pueden venir indefinidas. */
function clases(...nombres: (string | false | undefined)[]): string {
  return nombres.filter(Boolean).join(' ');
}

function textoBits(bits: number): string {
  return bits === 1 ? '1 bit' : `${bits} bits`;
}

export default function HeaderFormat({ encabezado }: Props) {
  const id = useId();
  const [formato, setFormato] = useState<FormatoVista>('campo');
  const [seleccionado, setSeleccionado] = useState<number | null>(null);

  const ubicaciones = useMemo(() => desplazamientos(encabezado), [encabezado]);
  const tramos = useMemo(() => calcularTramos(ubicaciones), [ubicaciones]);
  const bytes = longitudEnBytes(encabezado);

  const campoElegido = seleccionado === null ? undefined : encabezado.campos[seleccionado];
  const ubicacionElegida = seleccionado === null ? undefined : ubicaciones[seleccionado];

  function botonDeCampo(
    indice: number,
    clase: string | undefined,
    contenido: ReactNode,
    posicion?: CSSProperties,
  ) {
    const elegido = indice === seleccionado;
    return (
      <button
        key={indice}
        type="button"
        className={clases(clase, elegido && estilos.elegido)}
        style={posicion}
        aria-pressed={elegido}
        aria-controls={`${id}-detalle`}
        onFocus={() => setSeleccionado(indice)}
        onClick={() => setSeleccionado(indice)}
        data-campo={encabezado.campos[indice]?.nombre}
      >
        {contenido}
      </button>
    );
  }

  return (
    <div
      className={estilos.formato}
      data-capa={encabezado.capa}
      role="group"
      aria-labelledby={`${id}-titulo`}
    >
      <div className={estilos.cabecera}>
        <p id={`${id}-titulo`} className={estilos.titulo}>
          {encabezado.nombre}
        </p>
        <p className={estilos.meta}>
          Capa {encabezado.capa} · {NOMBRE_CAPA[encabezado.capa]} · {bytes} bytes
        </p>
      </div>

      <fieldset className={estilos.selector}>
        <legend>Formato de los valores</legend>
        {OPCIONES.map(({ valor, etiqueta }) => (
          <label key={valor} className={estilos.opcion}>
            <input
              type="radio"
              name={`${id}-formato`}
              value={valor}
              checked={formato === valor}
              onChange={() => setFormato(valor)}
            />
            {etiqueta}
          </label>
        ))}
      </fieldset>

      <div className={estilos.rejilla} data-vista="rejilla">
        {MARCAS_REGLA.map((bit) => (
          <span
            key={bit}
            className={estilos.regla}
            style={{ gridColumn: `${bit + 1} / span 8`, gridRow: 1 }}
            aria-hidden="true"
          >
            {bit}
          </span>
        ))}
        {tramos.map((tramo) => {
          const campo = encabezado.campos[tramo.campo];
          if (campo === undefined) return null;
          const posicion = {
            gridColumn: `${tramo.columna + 1} / span ${tramo.ancho}`,
            gridRow: tramo.fila + 2,
          };
          const nombreVisible = campo.corto ?? campo.nombre;
          if (tramo.continua) {
            // La continuación es solo visual: el campo ya tiene su botón en el primer tramo.
            return (
              <div
                key={`${tramo.campo}-${tramo.fila}`}
                className={clases(estilos.celda, estilos.continua)}
                style={posicion}
                aria-hidden="true"
              >
                <span className={estilos.nombre}>{nombreVisible} (cont.)</span>
              </div>
            );
          }
          return botonDeCampo(
            tramo.campo,
            estilos.celda,
            <>
              <span className={estilos.nombre} title={campo.nombre}>
                {nombreVisible}
              </span>
              <span className="solo-lector">
                {campo.corto ? ` (${campo.nombre})` : ''}, {textoBits(campo.bits)}, valor
              </span>{' '}
              <span className={estilos.valor}>{valorEn(campo, formato)}</span>
            </>,
            posicion,
          );
        })}
      </div>

      <ol className={estilos.lista} data-vista="lista">
        {encabezado.campos.map((campo, indice) => (
          <li key={campo.nombre}>
            {botonDeCampo(
              indice,
              estilos.fila,
              <>
                <span className={estilos.nombre}>{campo.nombre}</span>
                <span className={estilos.bits}>
                  <span className="solo-lector">, </span>
                  {textoBits(campo.bits)}
                  <span className="solo-lector">, valor</span>
                </span>{' '}
                <span className={estilos.valor}>{valorEn(campo, formato)}</span>
              </>,
            )}
          </li>
        ))}
      </ol>

      <div id={`${id}-detalle`} className={estilos.detalle} aria-live="polite">
        {campoElegido && ubicacionElegida ? (
          <>
            <p className={estilos.detalleTitulo}>
              {campoElegido.nombre}
              {campoElegido.corto ? ` (${campoElegido.corto})` : ''}
            </p>
            <p className={estilos.meta}>
              {textoBits(campoElegido.bits)}, desde el bit {ubicacionElegida.desdeBit} hasta el{' '}
              {ubicacionElegida.desdeBit + campoElegido.bits - 1} · valor{' '}
              <span className={estilos.valor}>{valorEn(campoElegido, formato)}</span>
            </p>
            <p>{campoElegido.descripcion}</p>
          </>
        ) : (
          <p className={estilos.meta}>Elegí un campo para ver qué significa.</p>
        )}
      </div>
    </div>
  );
}
