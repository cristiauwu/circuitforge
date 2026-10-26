import { describe, expect, it } from 'vitest'
import {
  CANVAS_ZOOM,
  CONTENT_BOTTOM,
  CONTENT_TOP,
  HIT_HEIGHT,
  HIT_WIDTH,
  LABEL_CLEARANCE,
  PIN_CLEARANCE,
  PIN_HIT_RADIUS,
  PIN_OVERHANG,
  PIN_VISUAL_RADIUS,
  SELECTION_BORDER,
  SELECTION_CENTER_Y,
  SELECTION_HEIGHT,
  SELECTION_WIDTH,
} from './componentLayout'

/** Puntos por unidad de mundo a un zoom dado. */
const px = (unidades: number, zoom = CANVAS_ZOOM): number => unidades * zoom

describe('geometria del componente', () => {
  it('la zona de impacto cabe en la reticula', () => {
    // 2 x 1.5 celdas de 24 unidades.
    expect(HIT_WIDTH).toBe(48)
    expect(HIT_HEIGHT).toBe(36)
  })

  it('el punto visible del pin es menor que su zona de impacto', () => {
    // El visible es pequeno por estetica; el de impacto, grande para pulsar.
    expect(PIN_VISUAL_RADIUS).toBeLessThan(PIN_HIT_RADIUS)
  })

  it('el pin sobresale del borde del cuerpo', () => {
    expect(PIN_OVERHANG).toBeGreaterThan(0)
  })
})

describe('separacion entre pines y nombre', () => {
  /**
   * Es el bug que se veia a simple vista con el zoom actual: el nombre
   * "Resistencia" cruzaba el circulo del pin.
   *
   * El borde inferior del cuerpo esta en `-HIT_HEIGHT/2`. El pin se centra ahi,
   * asi que su PUNTA baja hasta `-HIT_HEIGHT/2 - PIN_OVERHANG`.
   *
   * El nombre se CENTRA en `-HIT_HEIGHT/2 - PIN_CLEARANCE`, y su borde SUPERIOR
   * esta media altura de texto por encima de ese centro. Hay que comparar el
   * borde superior del texto con la punta del pin: si el texto empieza mas abajo
   * que la punta, no hay solape.
   */
  const ALTURA_TEXTO = 9
  const BORDE_INFERIOR = -HIT_HEIGHT / 2
  const PUNTA_DEL_PIN = BORDE_INFERIOR - PIN_OVERHANG
  const CENTRO_DEL_NOMBRE = BORDE_INFERIOR - PIN_CLEARANCE
  const BORDE_SUPERIOR_DEL_NOMBRE = CENTRO_DEL_NOMBRE - ALTURA_TEXTO / 2

  it('el nombre NO se solapa con la punta del pin', () => {
    // El borde superior del texto debe quedar POR DEBAJO (mas negativo) que la
    // punta del pin. Con el valor anterior el solape era de 0.6 unidades.
    expect(BORDE_SUPERIOR_DEL_NOMBRE).toBeLessThan(PUNTA_DEL_PIN)
  })

  it('la separacion es perceptible a la escala actual', () => {
    const separacion = PUNTA_DEL_PIN - BORDE_SUPERIOR_DEL_NOMBRE
    // Por debajo de 3 px el ojo no lo distingue de un solape.
    expect(px(separacion)).toBeGreaterThanOrEqual(3)
  })

  it('el nombre sigue pegado al componente', () => {
    // Tampoco puede alejarse tanto que parezca de otro componente.
    const distancia = BORDE_INFERIOR - (CENTRO_DEL_NOMBRE + ALTURA_TEXTO / 2)
    expect(px(distancia)).toBeLessThan(40)
  })
})

describe('contorno de seleccion', () => {
  it('es un marco, no un bloque: las barras son finas', () => {
    // El original era un relleno de 56x44 unidades = 134x106 px de color solido.
    expect(SELECTION_BORDER).toBeLessThan(3)
    expect(px(SELECTION_BORDER)).toBeLessThan(8)
  })

  it('ENVUELVE el nombre: su borde inferior queda por debajo del texto', () => {
    // Este es el defecto que se veia: el marco cruzaba "Resistencia" por la mitad.
    // Medido, el cruce era de 8 px.
    const bordeInferiorDelMarco = SELECTION_CENTER_Y - SELECTION_HEIGHT / 2
    expect(bordeInferiorDelMarco).toBeLessThan(CONTENT_BOTTOM)
  })

  it('ENVUELVE la referencia: su borde superior queda por encima', () => {
    const bordeSuperiorDelMarco = SELECTION_CENTER_Y + SELECTION_HEIGHT / 2
    expect(bordeSuperiorDelMarco).toBeGreaterThan(CONTENT_TOP)
  })

  it('rodea con un margen visible pero no exagerado', () => {
    const bordeInferiorDelMarco = SELECTION_CENTER_Y - SELECTION_HEIGHT / 2
    const margen = CONTENT_BOTTOM - bordeInferiorDelMarco
    expect(px(margen)).toBeGreaterThan(2)
    expect(px(margen)).toBeLessThan(20)
  })

  it('el contorno se centra en el contenido, que es casi simetrico', () => {
    // Supuse que el contenido colgaba hacia abajo —referencia arriba, nombre
    // abajo— y que el centro quedaria por debajo del origen. **La medicion lo
    // desmintio**: la referencia sube 29.5 y el nombre baja 26.5, asi que el
    // centro esta a +1.5, practicamente en el origen.
    //
    // Se comprueba lo que importa: que el centro coincida con el punto medio del
    // contenido, no que tenga un signo concreto.
    const puntoMedio = (CONTENT_TOP + CONTENT_BOTTOM) / 2
    expect(SELECTION_CENTER_Y).toBeCloseTo(puntoMedio)
  })

  it('el contorno esta practicamente centrado, aunque no exactamente', () => {
    // Si estuviera desplazado mas de una celda, el marco se veria descentrado
    // respecto al componente.
    expect(Math.abs(SELECTION_CENTER_Y)).toBeLessThan(24 / 4)
  })

  it('es mas ancho que el cuerpo del componente', () => {
    expect(SELECTION_WIDTH).toBeGreaterThan(HIT_WIDTH)
  })
})

describe('escala del lienzo', () => {
  it('un componente mide mas de 100 px de ancho', () => {
    // Por debajo de 100 px el simbolo no se distingue con comodidad. Medido: con
    // el zoom anterior (1.25) media 60 px y parecia una linea con dientes.
    expect(px(HIT_WIDTH)).toBeGreaterThan(100)
  })

  it('un componente no domina el lienzo', () => {
    // Tampoco puede ocupar tanto que no quepan varios: 18 celdas de ancho.
    expect(px(HIT_WIDTH)).toBeLessThan(160)
  })

  it('la referencia se separa del borde superior', () => {
    expect(LABEL_CLEARANCE).toBeGreaterThan(0)
    expect(px(LABEL_CLEARANCE)).toBeGreaterThan(8)
  })
})
