# Nexo — gato, modelos propios y protoboard eléctrica

## Alcance y procedencia

El usuario autorizó crear activos propios y delegó decisiones. Se preservó React/Three, la identidad carbón/perla y el dominio eléctrico corregido. Se usó REA para volver a observar el acceso público de Tinkered: evidencia `ev_43b5893c2e5b3a4704f3ff6700da96523c776354c632290b8aab8b1cdb1c39ad` confirma la página «Tinkered — Sign in», no su editor. **No se extrajeron modelos de Tinkered, no se atravesó autenticación ni se reutilizaron credenciales.** Todos los modelos y el personaje incorporados son autorales/procedurales del proyecto; no se afirma equivalencia mecánica con terceros.

## Gato original

`OrangeCat.tsx` y `orange-cat.css`: personaje naranja rubber-hose años 30, silueta orgánica enroscada, hocico y guantes crema, tinta cálida, cola larga y expresión de sueño/despertar. Activo vectorial propio, no imagen generada ni copia de un personaje existente. Integrado en `ContextHelp`.

- Reposo estático; no RAF ni animación infinita de atención.
- Primera adición/inicio de conexión puede activar la invitación ya limitada por sesión.
- Transición de 140–220ms en transform/opacity, curva `cubic-bezier(.23,1,.32,1)`.
- Continuar trabajando lo duerme; ignorar/cerrar/desactivar conserva control y foco.
- Reduced motion: cambio estático sin transformaciones/transiciones.
- Ayuda local no modal, no proveedor IA.

## Componentes

Registro central `capabilities.ts`: **20 tipos editables** de **23 fichas**. Se conservan ESP32, UNO, resistencia, LED, fuente DC y tierra. Se añaden modelos propios de capacitor, diodo, LDR, potenciómetro, batería 9V, buzzer, inductor, BJT NPN, servo, motor DC, DHT22, HC-SR04 y OLED I2C, además de la protoboard. ESC30A, LiPo3S y SPIFlash permanecen consulta, no botones engañosos de montaje.

`modelParts.ts` contiene geometrías diferenciadas, materiales y etiquetas con ownership por instancia. Las anclas coinciden con los pines lógicos del catálogo; no se inventó pinout físico completo. Huellas gobiernan colocación. El catálogo ampliado conserva altura natural de filas y scroll: se corrigió encogimiento flex que solapaba descripciones.

## Protoboard y cables

Definición única en `packages/netlist/src/breadboard.ts`:

- 30 filas, contactos a–e y f–j: 60 tiras de cinco, aisladas por el canal central.
- Cuatro rieles continuos de 30 contactos, sin corte central en este modelo.
- 420 contactos, 64 grupos internos. Todos pasivos; +/− impresos no alimentan.
- Colocar encima no conecta automáticamente. Cada terminal se conecta a un contacto expresamente.

`Project.wires` conserva cables físicos por ID y dos extremos. Nets se reconstruyen mediante cables + grupos internos, sin dibujar420uniones internas. Quitar puente o borrar placa divide redes; caminos alternativos se conservan. Undo/redo guarda una transacción por edición. Proyectos anteriores sin wires se materializan una vez antes de editar; wires=[] es autoritativo aunque existan nets antiguos.

`canConnect` verifica conectividad resultante y rechaza cortos a través de tiras/rieles antes de mutar historial. El índice de extremos usa tuplas serializadas sin colisiones de puntuación. Contactos de infraestructura sin usar no generan advertencias de montaje incompleto. No hay solver ni voltajes calculados.

Vista: agujeros instanciados y picking analítico por celdas de paso.16, con oclusión del cuerpo más cercano y transformaciones de placa. Un único resaltado instanciado para la tira seleccionada. Alternativa accesible: tres selects nativos y un botón del contacto exacto, no420tabulaciones. Inspector enumera cables explícitos y permite desconectarlos.

## Verificación ejecutada

- Typecheck web y build: pasan,80módulos.
- Web:350pruebas en19archivos, pasan.
- Netlist:20pruebas, pasan.
- Validación:47pruebas, pasan.
- **Total417pruebas**, sin sumar escenarios de navegador como pruebas unitarias.
- Biome acotado45archivos:0errores,17advertencias preservadas; no afirma lint global limpio.
- Detector Impeccable de la tanda: `[]`.
- Pruebas de420contactos reales del modelo, rotación/traslación, cuerpo oclusor, framing portrait, strip/rail highlighting, cable explícito, legacy migration, short/aislamiento, eliminación/undo/pureza.
- Revisión independiente encontró dos defectos corregidos con regresiones: materialización legacy podía convertir tiras implícitas en cables; claves con `:` podían confundir extremos distintos.
- Primera tanda navegador:11escenarios pasaron,2fallaron (catálogo comprimido y timeout de captura de target en segundo plano). Se corrigió flex-shrink y el harness activa su propio target antes de capturar. Confirmación final: **12 grupos de escenarios pasan, cero fallos**, con adición/selección de los 20 tipos, selección WebGL real de BB1.a15, alternativa HTML, unión por tira/aislamiento/short, quitar cables/placa y undo/redo, gato y reduced motion. El handoff de captura no se cuenta como escenario funcional adicional. Detalles en `nexo-breadboard/production-regression.json`.
- REA capturó la aplicación final poblada en1440×1000: `ev_05c2e81b6af7dacb2a65ffd5a624393b722a4f5d518f381c3eccfea1c5cb60a4`. Se leyó el sobre JSON completo, decodificó el PNG completo y se inspeccionó visualmente. `rea-desktop-final.png` conserva el resultado.
- Residual menor observado: al volver a la ruta del editor, el mensaje inicial local puede decir «Añade una pieza…» aunque el proyecto conservado tenga piezas; los contadores y el circuito son correctos. No se añadió otra ronda de retoques.

## Límites medidos

Motor escena647.08kB minificado /166.71kB gzip; aviso >250kB continúa visible. CSS global17.35kB más3.90kB de editor. Sin nuevas dependencias o lockfile. Modelos ilustrativos, no dimensiones certificadas ni representación de firmware funcional. Sesión sin persistencia tras recarga, sin simulador/compilador/IA remota. Headless desktop/mobile no certifica FPS de teléfono real ni tacto físico. No commits/push ni eliminación de materiales previos.
