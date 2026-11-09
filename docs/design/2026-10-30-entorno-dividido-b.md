# CircuitForge — Entorno de desarrollo dividido B

Fecha: 2026-10-30
Estado: distribución B elegida por el usuario; alcance de implementación propuesto para aprobación.

## Intención

Entorno general y adaptable para desarrollar electrónica, aprender y analizar proyectos. No se restringe a plantillas o tipos de proyecto. Arduino UNO y ESP32 son las placas prioritarias; C++ es el lenguaje confirmado. El framework y los motores de ejecución siguen pendientes de decisión y validación.

## Elección y alternativas

Se compararon dos prototipos en docs/design/propuestas-entorno.html:

- A, Banco de trabajo: biblioteca expandida y montaje central amplio; código en otra vista. Favorece exploración y espacio del montaje, pero obliga a alternar para contrastar firmware.
- B, Desarrollo dividido: montaje y código simultáneos, biblioteca compacta y asistente lateral. Favorece comparar conexiones y firmware, a cambio de mayor densidad.

El usuario eligió B. No se interpreta esa elección como aprobación de un motor, modelo 3D, framework C++ ni simulación ficticia.

## Producto confirmado

- Público principiante y con experiencia; explicaciones accesibles sin tutorial obligatorio.
- Se puede empezar colocando piezas, conversando o combinando ambos caminos.
- El asistente comprende el proyecto actual y pide confirmación antes de modificarlo.
- Montaje mixto: protoboard opcional y conexiones directas fuera de ella.
- Vistas relacionadas del mismo proyecto: montaje, esquema, código y explicaciones.
- Objetivo de simulación eléctrica y ejecución real de firmware.
- Wi-Fi/Bluetooth solo entre dispositivos virtuales; soporte efectivo pendiente de demostrar.

## Composición propuesta para implementar

- Barra superior: proyecto, historial y estado real de disponibilidad de acciones.
- Biblioteca compacta con nombres accesibles; se expande para buscar y consultar componentes. No depender exclusivamente de iconos.
- Centro dividido en montaje/esquema y código. Separador redimensionable, con opción de ampliar una vista sin perder estado.
- Asistente a la derecha, colapsable. Inspector de propiedades accesible sin superponer permanentemente otro panel al montaje.
- Diagnóstico y consola en área inferior desplegable. Estados de compilación, validación y simulación diferenciados.
- En pantallas estrechas, alternar paneles mediante controles explícitos en lugar de comprimir tres columnas. La edición completa de escritorio no se declara equivalente en móvil sin verificarla.

La capacidad de redimensionar y colapsar paneles es una propuesta del asistente, no una preferencia previamente expresada por el usuario.

## Interacciones

- Selección compartida entre componente y propiedades; conservar proyecto y selección al cambiar de vista.
- Asistente: entender, preguntar, proponer, confirmar y aplicar una operación deshacible.
- Propuesta pendiente identifica adiciones, cambios y eliminaciones. Cancelar no modifica el proyecto.
- Si cambia el proyecto después de generar la propuesta, revisarla antes de aplicarla.
- No abrir diálogos ni interrumpir ante cada pieza añadida.
- Movimiento breve en paneles y estados; ninguna cortina de navegación durante cableado o edición. Respetar movimiento reducido.

## Primera implementación propuesta: interfaz y capacidades existentes

1. Reorganizar el editor existente según B, preservando colocación, movimiento, rotación, borrado, historial y cableado que ya funcionan.
2. Incorporar navegación de paneles, biblioteca expandible y división montaje/código adaptable.
3. Presentar el código editable como borrador del proyecto. Elegir el editor técnico durante la planificación según dependencias y necesidades; no prometer compilación o ejecución por mostrar texto editable.
4. Preparar el panel del asistente y el flujo visual de propuestas, con estado explícito de servicio no conectado hasta integrar una API real. Sin respuestas prefabricadas presentadas como IA.
5. Mostrar el esquema actual como tal. Un modelo físico 3D futuro no se sustituye por un dibujo etiquetado como 3D.
6. Comprobar interacción, teclado, contraste y distribución escritorio/estrecha, además de las verificaciones del repositorio que correspondan.

Esta fase no incluye por defecto un compilador, emulador, solver, red inalámbrica virtual, persistencia remota ni servicio de IA. Esos trabajos necesitan planes específicos. No se elimina su objetivo del producto: se evita fingir que el cambio visual los implementa.

## Dirección visual y restricciones

Usar docs/design/2026-10-30-referencias-visuales-y-movimiento.md como investigación. Base sobria, prioridad al contenido técnico y movimiento funcional. No copiar marcas, modelos cerrados ni fuentes comerciales sin licencia.

La distribución B está elegida; no se considera aprobado cada color o detalle del prototipo. No modificar la portada u otras rutas fuera del editor como efecto secundario.

## Conservación y verificación

- Reutilizar el netlist y el dominio existente; no convertir la geometría en fuente de verdad.
- Preservar los materiales previos y archivos sin seguimiento.
- Pruebas de regresión del editor y validación visual acotada cuando se implemente.
- REA MCP para observación y capturas. No declarar Playwright operativo hasta comprobarlo.

## Siguiente paso

Aprobar o corregir este alcance y luego preparar el plan técnico sobre los archivos actuales. No hay autorización de commit o push.
