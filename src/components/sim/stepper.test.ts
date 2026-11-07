import { describe, expect, it } from 'vitest';
import { crearEstado, esPrimero, esUltimo, stepper, type EstadoStepper } from './stepper';

const en = (indice: number, reproduciendo = false, total = 5): EstadoStepper => ({
  indice,
  total,
  reproduciendo,
});

describe('crearEstado', () => {
  it('empieza en el paso 0, en pausa', () => {
    expect(crearEstado(5)).toEqual(en(0));
  });

  it('rechaza líneas de tiempo vacías o con un total que no es entero', () => {
    expect(() => crearEstado(0)).toThrow(RangeError);
    expect(() => crearEstado(2.5)).toThrow(RangeError);
  });
});

describe('esPrimero y esUltimo', () => {
  it('reconocen los bordes', () => {
    expect(esPrimero(en(0))).toBe(true);
    expect(esUltimo(en(0))).toBe(false);
    expect(esUltimo(en(4))).toBe(true);
    expect(esPrimero(en(0, false, 1)) && esUltimo(en(0, false, 1))).toBe(true);
  });
});

describe('stepper', () => {
  describe('anterior', () => {
    it('retrocede un paso', () => {
      expect(stepper(en(3), { tipo: 'anterior' })).toEqual(en(2));
    });

    it('en el paso 0 no hace nada y devuelve el mismo estado', () => {
      const estado = en(0);
      expect(stepper(estado, { tipo: 'anterior' })).toBe(estado);
    });

    it('pausa la reproducción', () => {
      expect(stepper(en(3, true), { tipo: 'anterior' })).toEqual(en(2));
    });
  });

  describe('siguiente', () => {
    it('avanza un paso', () => {
      expect(stepper(en(1), { tipo: 'siguiente' })).toEqual(en(2));
    });

    it('en el último paso no hace nada y devuelve el mismo estado', () => {
      const estado = en(4);
      expect(stepper(estado, { tipo: 'siguiente' })).toBe(estado);
    });

    it('pausa la reproducción', () => {
      expect(stepper(en(1, true), { tipo: 'siguiente' })).toEqual(en(2));
    });
  });

  describe('reiniciar', () => {
    it('vuelve al paso 0 y pausa', () => {
      expect(stepper(en(3, true), { tipo: 'reiniciar' })).toEqual(en(0));
    });

    it('en el paso 0 y en pausa no cambia nada', () => {
      const estado = en(0);
      expect(stepper(estado, { tipo: 'reiniciar' })).toBe(estado);
    });
  });

  describe('reproducir', () => {
    it('reproduce desde el paso actual', () => {
      expect(stepper(en(2), { tipo: 'reproducir' })).toEqual(en(2, true));
    });

    it('en el último paso vuelve al 0 y reproduce desde ahí', () => {
      expect(stepper(en(4), { tipo: 'reproducir' })).toEqual(en(0, true));
    });

    it('con un solo paso no reproduce', () => {
      const estado = en(0, false, 1);
      expect(stepper(estado, { tipo: 'reproducir' })).toBe(estado);
    });
  });

  describe('pausar', () => {
    it('pausa sin moverse', () => {
      expect(stepper(en(2, true), { tipo: 'pausar' })).toEqual(en(2));
    });
  });

  describe('alternar', () => {
    it('reproduce si está en pausa', () => {
      expect(stepper(en(1), { tipo: 'alternar' })).toEqual(en(1, true));
    });

    it('pausa si se está reproduciendo', () => {
      expect(stepper(en(1, true), { tipo: 'alternar' })).toEqual(en(1));
    });

    it('en el último paso y en pausa vuelve a reproducir desde el 0', () => {
      expect(stepper(en(4), { tipo: 'alternar' })).toEqual(en(0, true));
    });
  });

  describe('tic', () => {
    it('avanza un paso mientras se reproduce', () => {
      expect(stepper(en(1, true), { tipo: 'tic' })).toEqual(en(2, true));
    });

    it('al llegar al último paso detiene la reproducción', () => {
      expect(stepper(en(3, true), { tipo: 'tic' })).toEqual(en(4));
    });

    it('en pausa no hace nada', () => {
      const estado = en(1);
      expect(stepper(estado, { tipo: 'tic' })).toBe(estado);
    });

    it('recorre toda la línea de tiempo y se detiene', () => {
      let estado = stepper(en(0), { tipo: 'reproducir' });
      for (let i = 0; i < 10; i++) estado = stepper(estado, { tipo: 'tic' });
      expect(estado).toEqual(en(4));
    });
  });
});
