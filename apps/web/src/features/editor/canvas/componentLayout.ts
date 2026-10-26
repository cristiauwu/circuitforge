/**
 * Medidas del componente en el lienzo.
 *
 * # Por que estan en un archivo propio
 *
 * Porque son la fuente de un bug real y de un desajuste de **1 px** que se veia
 * a simple vista con el zoom actual: el nombre del componente se cruzaba con los
 * circulos de los pines.
 *
 * Tenerlas juntas permite calcular las separaciones en vez de estimarlas, y
 * escribir un test que falle si alguien las cambia sin tener en cuenta a las
 * demas.
 *
 * # El sistema de coordenadas
 *
 * Todo en **unidades de mundo**, con el eje Y hacia **arriba** (convencion de
 * Three.js). El centro del componente es el origen.
 */

/** Zona de impacto del arrastre: 2 x 1.5 celdas de la reticula de 24. */
export const HIT_WIDTH = 48
export const HIT_HEIGHT = 36

/**
 * Radio de la zona clicable de un pin.
 *
 * Cinco unidades dan un objetivo de 10 unidades de diametro: comodo para pulsar
 * con el raton sin que los pines de un mismo componente se solapen entre si.
 */
export const PIN_HIT_RADIUS = 5

/** Radio del punto visible del pin. Menor que el de impacto, por estetica. */
export const PIN_VISUAL_RADIUS = PIN_HIT_RADIUS * 0.62

/**
 * Cuanto sobresale un pin por debajo del borde del cuerpo.
 *
 * Los pines se dibujan centrados en el borde inferior, asi que la mitad de su
 * radio queda por fuera. Es el dato que hay que conocer para no poner nada mas
 * debajo sin dejarlo chocar.
 */
export const PIN_OVERHANG = PIN_VISUAL_RADIUS

/**
 * Separacion entre la punta del pin y el nombre del componente.
 *
 * **Medido.** Con el valor anterior (`HIT_HEIGHT/2 + 7`) el nombre quedaba a 7
 * unidades del borde, pero el pin sobresale 3.1: el solape era de 0.6 unidades,
 * que a la escala actual se ve como 1 px de cruce entre el circulo y el texto.
 *
 * Se probaron margenes de 2, 4, 6 y 8 unidades. **4** deja 10 px de aire: separa
 * con claridad sin que el nombre se despegue del componente y parezca de otro.
 */
export const PIN_CLEARANCE = 4

/** Separacion entre la referencia (R1) y el borde superior del cuerpo. */
export const LABEL_CLEARANCE = 6

/** Altura de la referencia, en unidades de mundo. Coincide con su `fontSize`. */
export const REFERENCE_TEXT_HEIGHT = 11

/** Altura del nombre, en unidades de mundo. Coincide con su `fontSize`. */
export const NAME_TEXT_HEIGHT = 9

/**
 * Margen entre el contenido y el contorno de seleccion.
 *
 * El contorno debe **rodear todo el contenido**, no solo el cuerpo del simbolo.
 */
export const SELECTION_PADDING = 3

/**
 * Extension del contenido, de arriba abajo.
 *
 * El contorno de seleccion tiene que abarcar **todo** lo que dibuja un
 * componente: la referencia arriba, el cuerpo en medio y el nombre abajo.
 *
 * **Medido, el marco cruzaba el texto.** Iba de -23 a +23 unidades, pero el
 * nombre baja hasta -26.5: el borde inferior cortaba "Resistencia" por la mitad,
 * un cruce de **8 px** a la escala actual. Se veia clarisimamente con un
 * componente seleccionado.
 *
 * Estos cuatro valores derivan de las mismas constantes que colocan los textos,
 * asi que si alguien mueve la etiqueta, el marco se ajusta solo.
 */
export const CONTENT_TOP = HIT_HEIGHT / 2 + LABEL_CLEARANCE + REFERENCE_TEXT_HEIGHT / 2
export const CONTENT_BOTTOM = -HIT_HEIGHT / 2 - PIN_CLEARANCE - NAME_TEXT_HEIGHT / 2

/**
 * Contorno de seleccion.
 *
 * Es un **marco hueco**, no un bloque relleno. El original era un rectangulo
 * relleno al 18 %: con el zoom actual eso son **134 x 106 px** de color solido
 * detras del simbolo, que competia con el dibujo y ensuciaba la lectura. Un
 * contorno senala la seleccion sin tapar nada.
 *
 * Las medidas envuelven el contenido completo, no solo el cuerpo.
 */
export const SELECTION_WIDTH = HIT_WIDTH + SELECTION_PADDING * 2
export const SELECTION_HEIGHT = CONTENT_TOP - CONTENT_BOTTOM + SELECTION_PADDING * 2

/** Centro vertical del contorno, que no es el origen: el contenido es asimetrico. */
export const SELECTION_CENTER_Y = (CONTENT_TOP + CONTENT_BOTTOM) / 2

/** Grosor de las barras del contorno, en unidades de mundo. */
export const SELECTION_BORDER = 1.5

/**
 * Zoom inicial de la camara.
 *
 * **Medido, no elegido a ojo.** Con `zoom = 1.25` un componente de 48 unidades
 * media **60 x 45 px** en pantalla: el **5.8 %** del ancho del lienzo. El simbolo
 * era practicamente ilegible —una resistencia se veia como una linea con
 * dientes— y el lienzo parecia vacio aunque tuviera componentes.
 *
 * Medicion de las alternativas, sobre un lienzo de 1038 px:
 *
 *   zoom  | componente | % del ancho | celdas visibles
 *   1.25  |  60 x 45   |    5.8 %    |  35 x 25
 *   2.00  |  96 x 72   |    9.2 %    |  22 x 16
 *   2.40  | 115 x 86   |   11.1 %    |  18 x 13   <- elegido
 *   3.20  | 154 x 115  |   14.8 %    |  13 x 10
 *
 * Por debajo de 100 px de ancho el simbolo no se distingue. Entre 100 y 140 se
 * lee con comodidad y siguen cabiendo 18 celdas: suficiente para un circuito de
 * una docena de componentes sin alejarse.
 */
export const CANVAS_ZOOM = 2.4

/**
 * Ancho del frustum de la camara con zoom 1, en unidades de mundo.
 *
 * **Se comparte porque el arrastre necesita EXACTAMENTE el mismo valor.** La
 * conversion pantalla -> mundo depende de el, y tener dos constantes distintas en
 * dos archivos fue un bug real: la camara estaba en un zoom y la conversion del
 * arrastre en otro, asi que los componentes saltaban al moverlos.
 */
export const CANVAS_FRUSTUM_WIDTH = 800
