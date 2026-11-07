/**
 * Comprueba en tiempo de compilación que `Simulation` recibe una sola `timeline` o al menos
 * dos `escenarios`, nunca las dos cosas ni ninguna (pieza 2.4). Los `@ts-expect-error` los
 * verifica `pnpm check`: si alguno deja de ser un error de tipos, el chequeo falla.
 */
import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { simularDemo, simularDescarteDemo } from '../../engine/demo/escenario';
import type Simulation from './Simulation';

type Props = ComponentProps<typeof Simulation>;

const timeline = simularDemo();
const otra = simularDescarteDemo();
const uno = { id: 'uno', etiqueta: 'Uno', timeline };
const dos = { id: 'dos', etiqueta: 'Dos', timeline: otra };

describe('props de Simulation', () => {
  it('acepta una timeline o al menos dos escenarios, y nada más', () => {
    const conTimeline: Props = { titulo: 'T', timeline };
    const conEscenarios: Props = { titulo: 'T', escenarios: [uno, dos] };

    // @ts-expect-error: las dos cosas a la vez.
    const ambas: Props = { titulo: 'T', timeline, escenarios: [uno, dos] };
    // @ts-expect-error: ninguna de las dos.
    const ninguna: Props = { titulo: 'T' };
    // @ts-expect-error: un solo escenario no necesita selector.
    const unSoloEscenario: Props = { titulo: 'T', escenarios: [uno] };

    expect([conTimeline, conEscenarios, ambas, ninguna, unSoloEscenario]).toHaveLength(5);
  });
});
