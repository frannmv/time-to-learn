/**
 * Movimiento compartido por los diagramas de la simulación (`Topology` y `ProtocolStack`).
 *
 * Criterio común: lo que se mueve se desplaza solo al avanzar un paso. Al retroceder,
 * reiniciar o saltar, y con movimiento reducido, cambia de lugar sin desplazarse.
 */
import { duracionEnMs, esAvanceDeUnPaso, type Punto } from './geometria';

/** Lee la duración y la curva de los tokens (con movimiento reducido, la duración es 0). */
export function leerMovimiento(elemento: Element): { duracion: number; curva: string } {
  const estilo = getComputedStyle(elemento);
  return {
    duracion: duracionEnMs(estilo.getPropertyValue('--duracion-lenta')),
    curva: estilo.getPropertyValue('--curva-estandar').trim() || 'ease',
  };
}

const iguales = (a: Punto, b: Punto) => a.x === b.x && a.y === b.y;

/**
 * Cancela las animaciones del diagrama y, si se avanzó un paso, desplaza cada elemento con
 * el atributo `data-{atributo}` desde su posición anterior hasta la actual. Un elemento que
 * recién aparece no viene de ningún lado: se muestra sin moverse.
 */
export function desplazar(
  raiz: SVGSVGElement,
  atributo: string,
  previo: { readonly indice: number; readonly posiciones: ReadonlyMap<string, Punto> } | null,
  actual: { readonly indice: number; readonly posiciones: ReadonlyMap<string, Punto> },
): void {
  for (const animacion of raiz.getAnimations({ subtree: true })) animacion.cancel();
  if (previo === null || !esAvanceDeUnPaso(previo.indice, actual.indice)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const { duracion, curva } = leerMovimiento(raiz);
  if (duracion <= 0) return;

  for (const elemento of raiz.querySelectorAll<SVGGElement>(`[data-${atributo}]`)) {
    const id = elemento.getAttribute(`data-${atributo}`) ?? '';
    const desde = previo.posiciones.get(id);
    const hasta = actual.posiciones.get(id);
    if (desde === undefined || hasta === undefined || iguales(desde, hasta)) continue;
    elemento.animate(
      [
        { transform: `translate(${desde.x}px, ${desde.y}px)` },
        { transform: `translate(${hasta.x}px, ${hasta.y}px)` },
      ],
      { duration: duracion, easing: curva },
    );
  }
}
