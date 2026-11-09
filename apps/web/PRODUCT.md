# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personas que aprenden electrónica y personas con experiencia que desarrollan distintos tipos de proyectos. No requiere seleccionar un perfil de experiencia ni una plantilla.

## Product Purpose

Nexo (nombre provisional) es un entorno general y adaptable para diseñar, comprender, programar y simular proyectos electrónicos. Arduino UNO y ESP32 son las placas prioritarias, con firmware C++.

## Operating Context

El usuario puede comenzar colocando componentes, conversando con el asistente o combinando ambas acciones. El asistente debe solicitar confirmación antes de aplicar cambios. El montaje objetivo combina protoboard opcional y conexiones directas externas. El entorno B elegido presenta circuito y código simultáneamente, biblioteca expandible, asistente/inspector lateral y diagnóstico inferior.

## Capabilities and Constraints

La aplicación principal usa el frontend Nexo en React. La prioridad actual es exclusivamente ordenador; no se amplía ni certifica la experiencia móvil/tablet. El montaje 3D ilustrativo permite añadir, seleccionar, mover, rotar, eliminar y conectar instancias con historial eléctrico. El registro puro compartido contiene 73 tipos editables: 70 componentes electrónicos y tres auxiliares (protoboard, fuente DC simbólica y tierra). Todos tienen modelo propio, terminales, huella, símbolo y miniatura estática; ESC 30A, LiPo 3S y SPI Flash ya no son fichas solo de consulta. Las familias comparten técnicas de construcción, no modelos genéricos renombrados. Los pines conectables son los declarados en cada contrato; no se afirma certificación mecánica ni pinout completo de todos los módulos.

Los parámetros definidos por el registro se inicializan por instancia y pueden editarse con historial. Valores nominales no equivalen a resultados simulados. Interruptores, pulsadores, DIP, reed, contactos manuales de relé y tecla seleccionada usan contactos ideales que reconstruyen redes; los cambios que ocasionan un corto se rechazan antes de modificar el historial. No hay simulación de bobina, semiconductores, IC o firmware.

En escritorio hay montaje y borrador C++ simultáneos con separador ajustable; cuando no caben se alternan. Proyecto, código, notas y preferencias se conservan al navegar dentro de la sesión, pero no sobreviven a una recarga. No hay compilador, emulador, solver ni proveedor de IA conectado. La ayuda es local y opcional, con una invitación automática como máximo hasta reactivación explícita. El gato naranja es un personaje SVG original de estética rubber-hose, creado para Nexo tras la autorización de arte propio. Duerme estático, muestra una expresión despierta al ofrecer/abrir ayuda y respeta movimiento reducido; no tiene bucles insistentes ni proveedor de IA.

Las conexiones se validan al crearlas. Los cables guardan extremos explícitos dentro del proyecto de sesión; las redes se derivan de esos cables y de los grupos internos de protoboard. Desconectar un cable o eliminar una placa reconstruye la conectividad. La protoboard tiene 60 tiras aisladas de cinco contactos y cuatro rieles continuos de 30, pasivos y sin alimentar; colocar una pieza encima no la conecta automáticamente. La inserción es explícita para ocho tipos (resistencia, LED, diodo, capacitor, capacitor cerámico, inductor, LDR y BJT NPN), mediante huella canónica, contactos completos y ocupación por patas. Insertar, recolocar y extraer son operaciones atómicas; las piezas insertadas siguen la posición/orientación de la placa y sus patas formadas alcanzan los contactos exactos. Borrar la placa las despega conservando su pose mundial y los cables externos pertinentes. Una pieza insertada no admite arrastre libre hasta extraerla. Los cables pueden compartir contacto con patas; no se impone exclusividad mecánica a los extremos de cable. Las curvas de los cables son geometría derivada, no un recorrido mecánico guardado ni prueba de simulación. Los ejemplos de proyectos/compartidos son metadatos identificados como tales; no son almacenamiento remoto.

Los objetivos futuros incluyen ejecución de firmware y simulación eléctrica, y Wi-Fi/Bluetooth únicamente entre dispositivos simulados. Los motores, las variantes exactas y el framework C++ requieren validación. GPT-4o mini es el modelo solicitado para la futura asistencia, no un servicio actualmente integrado.

## Evidence on Hand

Documentación de alcance en docs/design/2026-10-30-entorno-dividido-b.md e investigación de referencias en docs/design/2026-10-30-referencias-visuales-y-movimiento.md. La distribución fue elegida mediante docs/design/propuestas-entorno.html. La maqueta no es prueba de simulación o IA.

## Product Principles

- Un proyecto conecta representación, conexiones y código; la geometría no sustituye al netlist.
- Ayudar a aprender sin impedir edición manual directa.
- Confirmar cambios del asistente y preservar el control del usuario.
- Distinguir representación, validación y simulación real.
- Extender capacidades sin limitar el producto a proyectos predeterminados.
