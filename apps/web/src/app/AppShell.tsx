import { Outlet, useLocation } from 'react-router-dom'
import { SiteHeader } from '@/features/navigation/SiteHeader'
import { Atmosphere } from '@/ui'

/**
 * Layout raiz — patron de *app shell* de altura fija.
 *
 * La portada (`/`) va sin cabecera: es la unica superficie en modo Persuade y
 * una barra de navegacion sobre el circuito ensamblandose rompe la escena.
 *
 * **Altura:** el shell mide exactamente la ventana (`h-dvh`) y NO crece con el
 * contenido. Esto es lo que hace que el editor quepa en pantalla. Antes usaba
 * `min-h-dvh`, que permite crecer: medido, la pagina llegaba a 1529 px en un
 * viewport de 900 porque la paleta con 22 fichas empujaba la rejilla a 1391 px.
 * Con la altura fija, el scroll vive DENTRO del area que lo necesita.
 *
 * `key` en el main remonta el arbol al cambiar de ruta, para que las animaciones
 * de entrada se disparen aunque dos vistas compartan estructura.
 *
 * **Atmosfera:** la capa de aurora, grano y vineta vive AQUI, no en cada ruta,
 * para que el fondo sea continuo entre navegaciones. El editor la recibe mas
 * tenue porque su lienzo ya tiene iluminacion propia.
 */
export function AppShell() {
  const { pathname } = useLocation()

  // La portada va sin cabecera: es donde el fondo es el protagonista y una barra
  // encima rompe la escena.
  const isLanding = pathname === '/'
  // El editor gestiona su propio scroll: sus paneles desplazan por dentro y el
  // lienzo debe ocupar el alto disponible sin que la pagina se mueva.
  const isEditor = pathname === '/editor'

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-bg">
      <Atmosphere intensity={isEditor ? 'soft' : 'full'} />

      {/*
        El contenido va en su propia capa por encima de la atmosfera. Sin este
        `relative z-10` los halos y el grano quedarian por delante del texto.
      */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {!isLanding && <SiteHeader />}
        {/*
          `min-h-0` es imprescindible: por defecto un hijo flex tiene
          `min-height: auto`, que le impide encoger por debajo de su contenido. Sin
          el, `flex-1` no acota nada y el shell vuelve a crecer.
        */}
        <main
          key={pathname}
          className={
            isEditor
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
              : 'flex min-h-0 flex-1 flex-col overflow-y-auto'
          }
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
