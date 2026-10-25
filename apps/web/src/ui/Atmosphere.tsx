/**
 * Capa atmosferica del sitio.
 *
 * Se monta UNA vez en el shell, no por ruta: asi el fondo con aurora, el grano
 * y la vineta son continuos entre navegaciones. Si vivieran en cada pagina, al
 * cambiar de ruta se reiniciarian las animaciones de deriva y el usuario veria
 * un salto en el fondo.
 *
 * Todo es decorativo y esta oculto a lectores de pantalla. El grano y la vineta
 * van por encima del fondo pero por debajo del contenido (`z-index` 0 y 1, y el
 * contenido en el flujo normal), y ninguno intercepta el puntero.
 */

export interface AtmosphereProps {
  /**
   * Intensidad de la aurora.
   *
   * El editor usa `soft`: el lienzo ya tiene su propia iluminacion y un fondo
   * muy cargado le robaria contraste a los cables de colores.
   */
  intensity?: 'full' | 'soft'
}

export function Atmosphere({ intensity = 'full' }: AtmosphereProps) {
  return (
    <div aria-hidden="true" data-intensity={intensity}>
      {/* Halos de color que derivan lentamente */}
      <div className="cf-aurora" style={intensity === 'soft' ? { opacity: 0.45 } : undefined}>
        <div className="cf-aurora__halo cf-aurora__halo--1" />
        <div className="cf-aurora__halo cf-aurora__halo--2" />
        <div className="cf-aurora__halo cf-aurora__halo--3" />
      </div>

      {/* Grano de pelicula sobre todo el viewport */}
      <div className="cf-grain-layer" />

      {/* Vineta: empuja la mirada al centro */}
      <div className="cf-vignette" />
    </div>
  )
}
