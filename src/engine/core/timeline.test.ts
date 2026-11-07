import { describe, expect, it } from 'vitest';
import {
  TimelineInvalidaError,
  crearTimeline,
  validarTimeline,
  type Encabezado,
  type Enlace,
  type Nodo,
  type Paquete,
  type Step,
  type TablaEstado,
  type Timeline,
  type Topologia,
} from './timeline';

// --- Fixture: PC 1 — Switch — PC 2 -----------------------------------------------------

const pc1: Nodo = { id: 'pc1', tipo: 'host', etiqueta: 'PC 1', posicion: { x: 0, y: 0 } };
const sw: Nodo = { id: 'sw', tipo: 'switch', etiqueta: 'Switch', posicion: { x: 100, y: 0 } };
const pc2: Nodo = { id: 'pc2', tipo: 'host', etiqueta: 'PC 2', posicion: { x: 200, y: 0 } };
const e1: Enlace = { id: 'e1', extremos: ['pc1', 'sw'] };
const e2: Enlace = { id: 'e2', extremos: ['sw', 'pc2'] };
const topologia: Topologia = { nodos: [pc1, sw, pc2], enlaces: [e1, e2] };

const encabezados: Encabezado[] = [
  { capa: 2, nombre: 'Ethernet', campos: [{ nombre: 'EtherType', valor: '0x0800' }] },
  { capa: 3, nombre: 'IPv4', campos: [{ nombre: 'TTL', valor: '64' }] },
];

const tramaEnPc1: Paquete = { id: 't1', ubicacion: { tipo: 'nodo', nodo: 'pc1' }, encabezados };
const tramaEnE1: Paquete = {
  id: 't1',
  ubicacion: { tipo: 'enlace', enlace: 'e1', desde: 'pc1', hacia: 'sw' },
  encabezados,
};
const tramaEnSw: Paquete = { id: 't1', ubicacion: { tipo: 'nodo', nodo: 'sw' }, encabezados };

const tablaMac: TablaEstado = {
  id: 'mac',
  titulo: 'Tabla MAC',
  nodo: 'sw',
  columnas: ['Dirección', 'Puerto'],
  filas: [{ celdas: ['PC 1', '1'], marca: 'nueva' }, { celdas: ['PC 2', '2'] }],
};

const paso0: Step = {
  indice: 0,
  explicacion: 'PC 1 arma una trama.',
  paquetes: [tramaEnPc1],
  tablas: [],
  resaltados: { nodos: ['pc1'], enlaces: [] },
};
const paso1: Step = {
  indice: 1,
  explicacion: 'La trama viaja hacia el switch.',
  paquetes: [tramaEnE1],
  tablas: [],
  resaltados: { nodos: [], enlaces: ['e1'] },
};
const paso2: Step = {
  indice: 2,
  explicacion: 'El switch anota la dirección de origen.',
  paquetes: [tramaEnSw],
  tablas: [tablaMac],
  resaltados: { nodos: ['sw'], enlaces: [] },
};

const pasos: Step[] = [paso0, paso1, paso2];
const valida: Timeline = { topologia, pasos };

// --- Tests ------------------------------------------------------------------------------

describe('validarTimeline', () => {
  it('acepta una timeline correcta', () => {
    expect(validarTimeline(valida)).toEqual([]);
  });

  it('acepta un paquete que recorre el enlace en sentido contrario a sus extremos', () => {
    const vuelta: Paquete = {
      ...tramaEnE1,
      ubicacion: { tipo: 'enlace', enlace: 'e1', desde: 'sw', hacia: 'pc1' },
    };
    expect(
      validarTimeline({ topologia, pasos: [paso0, { ...paso1, paquetes: [vuelta] }] }),
    ).toEqual([]);
  });

  it('rechaza una timeline sin pasos', () => {
    expect(validarTimeline({ topologia, pasos: [] })).toEqual([
      'pasos: la línea de tiempo necesita al menos un paso',
    ]);
  });

  it('rechaza índices salteados o que no empiezan en 0', () => {
    expect(validarTimeline({ topologia, pasos: [paso0, paso1, { ...paso2, indice: 3 }] })).toEqual([
      'pasos[2]: el índice es 3 y debería ser 2',
    ]);
    expect(validarTimeline({ topologia, pasos: [{ ...paso0, indice: 1 }] })).toEqual([
      'pasos[0]: el índice es 1 y debería ser 0',
    ]);
  });

  it('rechaza una explicación vacía', () => {
    expect(validarTimeline({ topologia, pasos: [{ ...paso0, explicacion: '   ' }] })).toEqual([
      'pasos[0]: la explicación está vacía',
    ]);
  });

  describe('referencias rotas', () => {
    it('un enlace hacia un nodo que no existe', () => {
      const rota: Topologia = {
        nodos: [pc1, sw],
        enlaces: [{ id: 'e1', extremos: ['pc1', 'pc9'] }],
      };
      expect(validarTimeline({ topologia: rota, pasos: [paso0] })).toEqual([
        'topologia.enlaces[0]: el nodo «pc9» no existe',
      ]);
    });

    it('un paquete en un nodo que no existe', () => {
      const perdido: Paquete = { ...tramaEnSw, ubicacion: { tipo: 'nodo', nodo: 'r1' } };
      expect(validarTimeline({ topologia, pasos: [{ ...paso0, paquetes: [perdido] }] })).toEqual([
        'pasos[0].paquetes[0]: el nodo «r1» no existe',
      ]);
    });

    it('un paquete sobre un enlace que no existe', () => {
      const perdido: Paquete = {
        ...tramaEnE1,
        ubicacion: { tipo: 'enlace', enlace: 'e9', desde: 'pc1', hacia: 'sw' },
      };
      expect(validarTimeline({ topologia, pasos: [{ ...paso0, paquetes: [perdido] }] })).toEqual([
        'pasos[0].paquetes[0]: el enlace «e9» no existe',
      ]);
    });

    it('un sentido que no corresponde a los extremos del enlace', () => {
      const torcido: Paquete = {
        ...tramaEnE1,
        ubicacion: { tipo: 'enlace', enlace: 'e1', desde: 'pc1', hacia: 'pc2' },
      };
      expect(validarTimeline({ topologia, pasos: [{ ...paso0, paquetes: [torcido] }] })).toEqual([
        'pasos[0].paquetes[0]: «pc1» → «pc2» no son los extremos del enlace «e1»',
      ]);
    });

    it('resaltados y tablas que nombran nodos o enlaces inexistentes', () => {
      const paso: Step = {
        ...paso2,
        tablas: [{ ...tablaMac, nodo: 'sw9' }],
        resaltados: { nodos: ['sw9'], enlaces: ['e9'] },
      };
      expect(validarTimeline({ topologia, pasos: [paso0, paso1, paso] })).toEqual([
        'pasos[2].tablas[0]: el nodo «sw9» no existe',
        'pasos[2].resaltados: el nodo «sw9» no existe',
        'pasos[2].resaltados: el enlace «e9» no existe',
      ]);
    });
  });

  it('rechaza ids repetidos en la topología y dentro de un paso', () => {
    const repetida: Topologia = { nodos: [pc1, sw, pc2, pc1], enlaces: [e1, e2] };
    const paso: Step = { ...paso0, paquetes: [tramaEnPc1, tramaEnPc1] };
    expect(validarTimeline({ topologia: repetida, pasos: [paso] })).toEqual([
      'topologia.nodos: el id «pc1» está repetido',
      'pasos[0].paquetes: el id «t1» está repetido',
    ]);
  });

  it('rechaza enlaces de un nodo consigo mismo', () => {
    const lazo: Topologia = { nodos: [pc1, sw], enlaces: [{ id: 'e1', extremos: ['sw', 'sw'] }] };
    expect(validarTimeline({ topologia: lazo, pasos: [paso0] })).toEqual([
      'topologia.enlaces[0]: los dos extremos son el mismo nodo',
    ]);
  });

  it('rechaza filas con una cantidad de celdas distinta a la de columnas', () => {
    const paso: Step = { ...paso0, tablas: [{ ...tablaMac, filas: [{ celdas: ['PC 1'] }] }] };
    expect(validarTimeline({ topologia, pasos: [paso] })).toEqual([
      'pasos[0].tablas[0].filas[0]: tiene 1 celda(s) y la tabla tiene 2 columna(s)',
    ]);
  });

  // Estos datos pueden venir de MDX sin chequeo de tipos, por eso se validan en ejecución.
  it('rechaza capas, tipos de nodo y posiciones inválidos', () => {
    const invalida: Topologia = {
      nodos: [
        { ...pc1, posicion: { x: Number.NaN, y: 0 } },
        { ...sw, tipo: 'firewall' as never },
        pc2,
      ],
      enlaces: [e1, e2],
    };
    const paquete: Paquete = {
      ...tramaEnPc1,
      encabezados: [{ capa: 8 as never, nombre: '?', campos: [] }],
    };
    expect(
      validarTimeline({ topologia: invalida, pasos: [{ ...paso0, paquetes: [paquete] }] }),
    ).toEqual([
      'topologia.nodos[0]: la posición tiene que ser un par de números finitos',
      'topologia.nodos[1]: el tipo «firewall» no existe',
      'pasos[0].paquetes[0].encabezados[0]: la capa 8 no existe',
    ]);
  });
});

describe('validarTimeline: PDU, tamaños y pila por nodo', () => {
  const host: Nodo = { ...pc1, capas: [1, 2, 3, 4, 5, 6, 7] };
  const router: Nodo = { ...sw, tipo: 'router', capas: [1, 2, 3] };
  const conPilas: Topologia = { nodos: [host, router, pc2], enlaces: [e1, e2] };

  const trama: Paquete = {
    id: 't1',
    ubicacion: { tipo: 'nodo', nodo: 'sw', capa: 2 },
    pdu: 'Trama Ethernet',
    encabezados: [
      { capa: 2, nombre: 'Ethernet II', campos: [], bytes: 14 },
      { capa: 2, nombre: 'FCS', campos: [], bytes: 4, parte: 'cola' },
      { capa: 3, nombre: 'IPv4', campos: [], bytes: 20, parte: 'encabezado' },
    ],
    datos: { descripcion: '[Ejemplo] Carga', bytes: 26 },
  };
  const conTrama = (paquete: Paquete, topo: Topologia = conPilas): Timeline => ({
    topologia: topo,
    pasos: [{ ...paso0, paquetes: [paquete] }],
  });

  it('acepta pilas, capas en la ubicación, tamaños, colas, PDU y datos', () => {
    expect(validarTimeline(conTrama(trama))).toEqual([]);
  });

  it('acepta una capa en la ubicación de un nodo que no declara su pila', () => {
    const enPc2: Paquete = { ...trama, ubicacion: { tipo: 'nodo', nodo: 'pc2', capa: 7 } };
    expect(validarTimeline(conTrama(enPc2))).toEqual([]);
  });

  it('rechaza una capa de la ubicación que no existe', () => {
    const paquete: Paquete = {
      ...trama,
      ubicacion: { tipo: 'nodo', nodo: 'pc2', capa: 0 as never },
    };
    expect(validarTimeline(conTrama(paquete))).toEqual([
      'pasos[0].paquetes[0]: la capa 0 de la ubicación no existe',
    ]);
  });

  it('rechaza una capa que no está en la pila del nodo', () => {
    const paquete: Paquete = { ...trama, ubicacion: { tipo: 'nodo', nodo: 'sw', capa: 4 } };
    expect(validarTimeline(conTrama(paquete))).toEqual([
      'pasos[0].paquetes[0]: el nodo «sw» no implementa la capa 4',
    ]);
  });

  it('rechaza pilas vacías, con capas inexistentes, repetidas o desordenadas', () => {
    const topo: Topologia = {
      nodos: [
        { ...pc1, capas: [] },
        { ...sw, capas: [1, 2, 9 as never] },
        { ...pc2, capas: [1, 2, 2, 3] },
      ],
      enlaces: [e1, e2],
    };
    const otro: Topologia = {
      nodos: [{ ...pc1, capas: [1, 3, 2] }, sw, pc2],
      enlaces: [e1, e2],
    };
    expect(validarTimeline({ topologia: topo, pasos: [paso0] })).toEqual([
      'topologia.nodos[0]: la lista de capas está vacía',
      'topologia.nodos[1]: la capa 9 no existe',
      'topologia.nodos[2]: la capa 2 está repetida',
    ]);
    expect(validarTimeline({ topologia: otro, pasos: [paso0] })).toEqual([
      'topologia.nodos[0]: las capas tienen que ir de abajo hacia arriba',
    ]);
  });

  it.each([0, -14, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rechaza el tamaño %s en encabezados, colas y datos',
    (bytes) => {
      const paquete: Paquete = {
        ...trama,
        encabezados: trama.encabezados.map((e) => ({ ...e, bytes })),
        datos: { descripcion: '[Ejemplo] Carga', bytes },
      };
      const problema = `el tamaño es ${String(bytes)} y tiene que ser un entero positivo`;
      expect(validarTimeline(conTrama(paquete))).toEqual([
        `pasos[0].paquetes[0].encabezados[0]: ${problema}`,
        `pasos[0].paquetes[0].encabezados[1]: ${problema}`,
        `pasos[0].paquetes[0].encabezados[2]: ${problema}`,
        `pasos[0].paquetes[0].datos: ${problema}`,
      ]);
    },
  );

  it('rechaza una cola sin el encabezado de su capa', () => {
    const paquete: Paquete = {
      ...trama,
      encabezados: [
        { capa: 3, nombre: 'IPv4', campos: [] },
        { capa: 2, nombre: 'FCS', campos: [], parte: 'cola' },
      ],
    };
    expect(validarTimeline(conTrama(paquete))).toEqual([
      'pasos[0].paquetes[0].encabezados[1]: es una cola de la capa 2 y el paquete no tiene un encabezado de esa capa',
    ]);
  });

  it('rechaza una parte que no existe, una PDU sin nombre y datos sin descripción', () => {
    const paquete: Paquete = {
      ...trama,
      pdu: ' ',
      encabezados: [{ capa: 2, nombre: 'Ethernet II', campos: [], parte: 'relleno' as never }],
      datos: { descripcion: '' },
    };
    expect(validarTimeline(conTrama(paquete))).toEqual([
      'pasos[0].paquetes[0].encabezados[0]: la parte «relleno» no existe',
      'pasos[0].paquetes[0]: el nombre de la PDU está vacío',
      'pasos[0].paquetes[0].datos: la descripción está vacía',
    ]);
  });

  it('los campos nuevos sobreviven la ida y vuelta por JSON', () => {
    const t = crearTimeline(conPilas, [{ ...paso0, paquetes: [trama] }]);
    const copia: unknown = JSON.parse(JSON.stringify(t));
    expect(copia).toStrictEqual(structuredClone(t));
    expect(validarTimeline(copia as Timeline)).toEqual([]);
  });
});

describe('crearTimeline', () => {
  it('devuelve una timeline igual a los datos recibidos', () => {
    expect(crearTimeline(topologia, pasos)).toEqual(valida);
  });

  it('lanza TimelineInvalidaError con todos los problemas', () => {
    let error: unknown;
    try {
      crearTimeline(topologia, []);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(TimelineInvalidaError);
    expect(error).toHaveProperty('errores', [
      'pasos: la línea de tiempo necesita al menos un paso',
    ]);
  });

  it('la timeline es inmutable en todos sus niveles', () => {
    const t = crearTimeline(topologia, pasos);
    expect(Object.isFrozen(t)).toBe(true);
    expect(Object.isFrozen(t.pasos)).toBe(true);
    expect(Object.isFrozen(t.pasos[2]?.tablas[0]?.filas[0])).toBe(true);
    expect(Object.isFrozen(t.topologia.nodos[0]?.posicion)).toBe(true);
  });

  it('no congela ni comparte los datos recibidos', () => {
    const paso: { -readonly [K in keyof Step]: Step[K] } = { ...paso0 };
    const t = crearTimeline(topologia, [paso]);
    expect(Object.isFrozen(paso)).toBe(false);
    paso.explicacion = 'cambiada';
    expect(t.pasos[0]?.explicacion).toBe('PC 1 arma una trama.');
  });

  it('ida y vuelta por JSON conserva la igualdad', () => {
    const t = crearTimeline(topologia, pasos);
    const copia: unknown = JSON.parse(JSON.stringify(t));
    expect(copia).toStrictEqual(structuredClone(t));
    expect(validarTimeline(copia as Timeline)).toEqual([]);
  });
});
