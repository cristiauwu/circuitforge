# Nexo — cierre artístico y ampliación a70componentes

## Plan aprobado

Primero cierre artístico sobre los20modelos actuales; después registro único,73entradas editables (70componentes electrónicos sin contar protoboard/fuenteDC/tierra), parámetros y montaje físico explícito. No solver/firmware/persistencia ni nuevas dependencias. Mantener arte propio y paleta carbón/perla.

## Etapa artística construida

-20miniaturas WebP512×512 del `createProjectModel()` real, iluminaciónRoomEnvironment y cámara ortográfica con mismo fondo perla.212956B total; renderizador de herramientas único y generación local sin assets extraídos. Producción consume `<img loading=lazy>`, no uncanvas porpieza. Source/manifiesto/generador bajo `apps/web/tools`, aislados delbuild.
-`ComponentPreview` compartido enpaleta,biblioteca e inspector. Las tres fichas aún no editables de esta etapa muestran indisponibilidad explícita; no cuentan como modelos.
-Paleta dividida enheader búsqueda/categoría, resultadosindependientes yfooterAñadir siempre visible.
-Gato tiene dock reservado dentro de utilidad delworkspace; guía no modal enflujo, no encima delinspector/cámara/status. Motion reducido ycontrol de invitación preservados.
-Estadoidle derivado delproyecto evita mensajevacío alvolverarutapoblada. Feedback temporal4.5s sinperderestadopending/error deconexión.
-`frameProject()` real calcula bounds de piezas ycables, ajusta FOVhorizontal/vertical yfarplane. Hero conservaencuadrepropio; localizarpiezaindividualfunciona; resizepreservaorbita,targetyzoom salvoampliaciónnecesaria.
-Mobile campos16px,safeareas,targets44px, sinbloqueozoom. No certificación enteléfonofísico.

## Verificación artística

Buildpasa92módulos, tiposcorrectos;366pruebasweb en21archivos pasan (incluyen5previewtests y11framingtests nuevas). Elcoste delmotordeescena648.12kB/167.13gzip conserva warning>250kB. Miniaturas20:212956B, no carganThree enbiblioteca.

Primerbatchbrowser tuvo fallos deharness (selectoresdecámaraviejos, trigger768invisible, payloadEnterincompleto), nodeproductoconfirmados. Capturasconfirmación1440/768/390 revisadas:artepiezasconsistente,dockseparado,stickyAñadir y10piezasencuadradas. Informe exacto `nexo-art/art-integration-report.json`; evidenciaDEVgeometríasedistinguedelbuildpreview. PageScale2 esdiagnóstico, nocertificazoomnativo200%.

## Etapa70componentes ymontaje

Implementada después de la puerta artística. Por instrucción posterior del usuario, la segunda etapa se centra exclusivamente en **ordenador**; no se amplió ni verificó móvil/tablet en esta entrega.

### Inventario y arte

El registro puro `packages/netlist/src/componentRegistry.ts` contiene **73 entradas editables: 70 componentes electrónicos y tres auxiliares**. Las 50 incorporaciones incluyen pasivos/protección, interruptores, semiconductores, IC, reguladores y módulos de potencia, Nano/Pico/ATtiny, sensores, drivers, displays y teclado. También se completaron ESC30A, LiPo3S y SPIFlash. No se cuentan variantes de valor/color como piezas adicionales.

Cada tipo tiene pines explícitos, prefijo, valores predeterminados, huella, modelo autoral, símbolo y miniatura. Gate de completitud:368/368pruebas, incluidas las73miniaturas. La geometría usa builders por familia y recursos por instancia; no73cajas iguales ni73contextosWebGL. Las73miniaturasWebP512 suman726764B. Modelos de módulos pueden declarar subconjuntos lógicos; no se afirma pinout físico certificado.

### Parámetros y contactos ideales

Los valores se inicializan por instancia desde el registro. Números se confirman al salir/Enter, Escape descarta borrador; booleanos/enums aplican una transacción. Los estados de SPST/SPDT/pulsador/DIP/reed/relé manual/teclado alteran contactos ideales y reconstruyen redes, validando cortos antes de modificar historial. No se simulan bobinas, circuitos integrados, luz ni firmware.

### Inserción física

Ocho tipos admiten huella canónica: resistencia, LED, diodo, capacitor, capacitor cerámico, inductor, LDR y NPN. `Project.mounts` conserva componente/placa/anclaje/orientación/contactos, separado de cables. Insertar/Recolocar/Extraer son acciones explícitas y atómicas. Se valida ocupación de patas, todas las terminales, contactos reales y corto por la última pata antes del commit.

La pose de cada instancia se deriva de la placa; la rotación positiva respeta Three.y y la conversión dominio+y→mundo−z. Patas formadas terminan en los agujeros exactos. Movimiento/rotación de placa y preview arrastran piezas; cables externos actualizan sus extremos. El arrastre libre de pieza insertada se rechaza hasta extraerla. Extraer o borrar placa conserva pose mundial, elimina attachments y preserva cables externos de las piezas. Undo/redo restaura la transacción completa. La superposición casual sigue sin conectar. Los rieles son continuos y pasivos, no fuentes.

### Verificación final de ordenador

- TypeScript web y build productivo: pasan,161módulos.
- Web:970pruebas/27archivos; netlist58; validación50: **1078pruebas ejecutadas y aprobadas**.
- Lint acotado74archivos:0errores,28advertencias de complejidad; no se afirma lint global limpio.
- Navegador de producción1440×1000:73/73tipos añadidos/seleccionados/deshechos por UI real,73miniaturas decodificadas; parámetros,8perfiles de inserción,ocupación/cortorechazo,retirada/recolocación,borrado/undo,cables y continuidad entre rutas.
- Tanda principal:17escenarios pasaron y uno falló por límite de scroll del harness (5200px frente a7399px), con controles ya visibles. El fallo original permanece registrado; confirmación puntual corregida alcanzó7399/7399 y pasó. No se repitió el recorrido exhaustivo.
- Inspección DEV separada, de solo lectura de escena/cámara: cuatro puntas de resistencia/LED coinciden con contactos antes y después de arrastre real y rotación de placa. Esta evidencia no se confunde con lectura de stores de producción.
- Cero excepciones de navegador observadas. Móvil/tablet: **no probados** en etapa2. PageScale2 no equivale a zoom nativo200%.
- REA final: `ev_bbc061421177e9a3eeca58b9111bd8957a2f671478ced7be0f0d5c1f3abbe359`,1440×1000. Sobre completo procesado yPNGcompleto decodificado e inspeccionado en `nexo-70/1440/rea-mounted-desktop.png`.

Reporte exacto: `nexo-70/70-components-report.json`. Biblioteca completa en `nexo-70/1440/library-all-73-contact-sheet.png` (1440×11406).

El motor de escena pesa681.46kB/179.55kBgzip; continúa el aviso >250kB. Sin dependencias nuevas, commits o push. Proyecto/código/notas siguen en memoria de sesión y se pierden al recargar. No hay solver analógico, ejecución de firmware, IA remota ni guardado cloud. No se certifica rendimiento en hardware real.
