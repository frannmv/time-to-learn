/**
 * Controles de una simulación: anterior, siguiente, reiniciar y reproducir/pausar, con el
 * número de paso. Solo muestra el estado del stepper y avisa qué botón se presionó.
 *
 * Los botones de los bordes usan `aria-disabled` en lugar de `disabled`: así siguen
 * enfocables y el foco no se pierde cuando se llega al primer o al último paso (el reducer
 * ya ignora las acciones que no corresponden).
 */
import type { AccionStepper, EstadoStepper } from './stepper';
import { esPrimero, esUltimo } from './stepper';
import estilos from './StepControls.module.css';

interface Props {
  readonly estado: EstadoStepper;
  readonly alAccionar: (accion: AccionStepper) => void;
}

export default function StepControls({ estado, alAccionar }: Props) {
  const enPrimero = esPrimero(estado);
  const enUltimo = esUltimo(estado);
  const unSoloPaso = estado.total === 1;

  return (
    <div className={estilos.controles} role="group" aria-label="Controles de la simulación">
      <button
        type="button"
        className={estilos.boton}
        aria-disabled={enPrimero}
        aria-keyshortcuts="ArrowLeft"
        onClick={() => alAccionar({ tipo: 'anterior' })}
      >
        Anterior
      </button>
      <button
        type="button"
        className={`${estilos.boton} ${estilos.principal}`}
        aria-disabled={unSoloPaso}
        aria-keyshortcuts="Space"
        onClick={() => alAccionar({ tipo: 'alternar' })}
      >
        {estado.reproduciendo ? 'Pausar' : 'Reproducir'}
      </button>
      <button
        type="button"
        className={estilos.boton}
        aria-disabled={enUltimo}
        aria-keyshortcuts="ArrowRight"
        onClick={() => alAccionar({ tipo: 'siguiente' })}
      >
        Siguiente
      </button>
      <button
        type="button"
        className={estilos.boton}
        aria-disabled={enPrimero && !estado.reproduciendo}
        onClick={() => alAccionar({ tipo: 'reiniciar' })}
      >
        Reiniciar
      </button>
      <p className={estilos.contador}>
        Paso {estado.indice + 1} de {estado.total}
      </p>
    </div>
  );
}
