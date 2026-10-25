import { useState } from 'react'
import { CanvasStage } from '@/features/editor/CanvasStage'
import { Inspector } from '@/features/editor/Inspector'
import { Palette } from '@/features/editor/Palette'
import { Button, PanelGlass } from '@/ui'

/**
 * Editor (documento de diseño sección 4).
 *
 * Tres columnas: paleta a la izquierda, lienzo al centro, inspector a la derecha.
 * Es la pantalla nucleo del OE-1 y la que establece la densidad de la herramienta.
 *
 * **Presupuesto de glass: exactamente 3.** Paleta, inspector y barra de
 * simulación. `backdrop-filter` obliga a la GPU a releer el fondo en cada frame,
 * y con el lienzo a 60 fps mas superficies degradan el arrastre.
 *
 * **Sin arrastrar y sin simular**, por decision de alcance: la lógica de dominio
 * llega en la etapa siguiente. El estado de selección si es real, para que la
 * pantalla se sienta viva al recorrerla.
 */
export function EditorPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/*
        Encabezado de la pantalla. El editor es una herramienta y su título no
        necesita ocupar espacio visual, pero SI debe existir: sin el, la página
        no tiene punto de entrada para un lector de pantalla ni para la
        navegación por encabezados (WCAG 1.3.1, 2.4.6).
      */}
      <h1 className="sr-only">Editor de circuitos</h1>

      {/*
        Barra de la simulación — tercera y última superficie glass.

        A 320 px la fila no cabe: medido, las lecturas desbordaban 137 px y el
        texto de estado 213. Se permite el ajuste de linea en vez de esconder
        las lecturas, que son la instrumentacion del producto y no decoracion.
      */}
      <div className="border-b border-hairline">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="primary" plain disabled>
              Simular
            </Button>
            <Button variant="ghost" plain disabled>
              Reiniciar
            </Button>
          </div>

          <div aria-hidden="true" className="hidden h-5 w-px shrink-0 bg-hairline sm:block" />

          {/* Lecturas de instrumentacion: en cian, porque son mediciones */}
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

        `minmax(0, 1fr)` en las columnas, no `1fr`: sin el `0`, el mínimo de una
        pista es `auto` y el contenido la empuja hasta desbordar. Es la causa
        habitual de scroll horizontal en rejillas con contenido ancho (el lienzo).

        La rejilla usa `flex-1 min-h-0` y NO una altura calculada: el shell ya
        mide exactamente la ventana, así que aquí basta con ocupar el espacio
        restante. Antes intenté `h-[calc(100dvh-6.5rem)]`, pero en un contenedor
        flex en columna `flex-basis` define el tamaño en el eje principal y
        anulaba la altura explícita — medido: la rejilla seguía en 1415 px.
        Dejar que flex reparta el espacio es más simple y no depende de saber
        cuánto miden la cabecera y la barra.
      */}
      <div className="mx-auto grid w-full max-w-[1600px] min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[248px_minmax(0,1fr)_264px]">
        {/* Paleta */}
        <PanelGlass className="order-2 min-h-0 min-w-0 overflow-hidden lg:order-1">
          <Palette />
        </PanelGlass>

        {/* Lienzo */}
        <div className="order-1 flex min-h-[420px] min-w-0 flex-col lg:order-2">
          <CanvasStage selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        {/* Inspector */}
        <PanelGlass className="order-3 min-h-0 min-w-0 overflow-hidden">
          <Inspector selectedId={selectedId} />
        </PanelGlass>
      </div>
    </div>
  )
}

/** Lectura de instrumentacion: etiqueta, valor y unidad en monoespaciada. */
function Reading({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-2xs uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="cf-mono text-sm font-medium text-signal">{value}</dd>
      <dd className="cf-mono text-2xs text-text-muted">{unit}</dd>
    </div>
  )
}
