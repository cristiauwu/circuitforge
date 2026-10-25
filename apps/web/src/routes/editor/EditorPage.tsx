import { useState } from 'react'
import { CanvasStage } from '@/features/editor/CanvasStage'
import { Inspector } from '@/features/editor/Inspector'
import { Palette } from '@/features/editor/Palette'
import { Button, IconButton, PanelGlass } from '@/ui'

/**
 * Editor — la pantalla nucleo del OE-1.
 *
 * ADOPTA el lenguaje de la referencia:
 * - **Barra flotante** en pildora con glass, igual que la navegacion. La barra
 *   anterior era una franja de ancho completo con borde inferior: el patron
 *   generico de dashboard.
 * - **Controles de icono circulares** para las acciones secundarias.
 * - **Lecturas con eyebrow**: etiqueta micro en versalitas y valor monoespaciado.
 *   La referencia trata asi todos sus datos.
 *
 * **Presupuesto de glass: 3.** Paleta, inspector y barra flotante.
 * `backdrop-filter` obliga a la GPU a releer el fondo en cada frame y el lienzo
 * necesita esos ciclos para el arrastre a 60 fps.
 */
export function EditorPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/*
        Barra de simulacion flotante — superficie glass 1 de 3.

        El titulo de la pantalla vive AQUI, integrado en la barra, en vez de
        oculto con `sr-only` o en una franja aparte. Da orientacion visible sin
        costar altura vertical, que es el recurso escaso en una herramienta de
        lienzo. Sigue siendo el `h1` real de la pagina, asi que un lector de
        pantalla lo encuentra como encabezado de nivel 1 (WCAG 1.3.1/2.4.6).
      */}
      <div className="px-3 pt-3">
        <div className="cf-glass mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 rounded-pill px-3 py-2">
          <h1 className="shrink-0 text-sm font-semibold tracking-tight text-text-strong">Editor</h1>

          <span
            aria-hidden="true"
            className="hidden h-5 w-px shrink-0 bg-hairline-strong sm:block"
          />

          <div className="flex shrink-0 items-center gap-2">
            <Button variant="primary" size="sm" plain disabled>
              Simular
            </Button>
            <IconButton label="Reiniciar simulación" variant="ghost" size="sm" disabled>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </IconButton>
          </div>

          <span
            aria-hidden="true"
            className="hidden h-5 w-px shrink-0 bg-hairline-strong sm:block"
          />

          {/* Lecturas de instrumentacion */}
          <dl className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1">
            <Reading label="V" value="5.00" unit="V" />
            <Reading label="I" value="0.00" unit="mA" />
            <Reading label="P" value="0.00" unit="mW" />
          </dl>

          <p className="w-full text-xs text-text-muted lg:ml-auto lg:w-auto">
            Motor de simulación en la etapa siguiente
          </p>
        </div>
      </div>

      {/*
        Tres columnas en pantallas anchas; apiladas a partir de lg (1024 px).

        `minmax(0, 1fr)` en las columnas, no `1fr`: sin el `0`, el minimo de una
        pista es `auto` y el contenido la empuja hasta desbordar.

        La rejilla usa `flex-1 min-h-0` y NO una altura calculada: el shell ya
        mide exactamente la ventana, asi que aqui basta con ocupar el espacio
        restante. Una altura explicita no funciona porque en un contenedor flex
        en columna `flex-basis` define el tamano en el eje principal y la anula.
      */}
      <div className="mx-auto grid w-full max-w-[1600px] min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[248px_minmax(0,1fr)_264px]">
        {/* Paleta — superficie glass 2 de 3 */}
        <PanelGlass className="order-2 min-h-0 min-w-0 overflow-hidden lg:order-1">
          <Palette />
        </PanelGlass>

        {/* Lienzo */}
        <div className="order-1 flex min-h-[420px] min-w-0 flex-col lg:order-2">
          <CanvasStage selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        {/* Inspector — superficie glass 3 de 3 */}
        <PanelGlass className="order-3 min-h-0 min-w-0 overflow-hidden">
          <Inspector selectedId={selectedId} />
        </PanelGlass>
      </div>
    </div>
  )
}

/**
 * Lectura de instrumentacion.
 *
 * Etiqueta en eyebrow (versalitas micro, apagada) y valor en monoespaciada con
 * el mismo color que el texto principal. La version anterior pintaba el valor en
 * cian: con tres lecturas cian en pantalla, el cian dejaba de significar "esto es
 * una medicion en vivo" y se volvia decoracion.
 */
function Reading({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="cf-eyebrow">{label}</dt>
      <dd className="cf-mono text-sm font-medium text-text-strong">{value}</dd>
      <dd className="cf-mono text-2xs text-text-muted">{unit}</dd>
    </div>
  )
}
