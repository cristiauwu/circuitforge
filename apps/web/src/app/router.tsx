import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { LandingPage } from '@/routes/landing/LandingPage'
import { NotFoundPage } from '@/routes/not-found/NotFoundPage'
import { AppShell } from './AppShell'

/**
 * Rutas del shell (documento de diseño sección 4).
 *
 * Las transiciones entre rutas usan la API nativa View Transitions, que React
 * Router 7 expone con `viewTransition` en los `<Link>`. Sin dependencia
 * adicional: el navegador que no la soporta cambia de ruta sin animar, que es
 * una degradación limpia y no un fallo.
 *
 * ## Por qué el editor se carga en diferido
 *
 * El editor arrastra **three.js y React Three Fiber**, que juntos pesan unos
 * 250 KB gzip. Cargarlos en la portada significa que un visitante que solo quiere
 * leer la página de inicio descarga el motor 3D antes de ver nada, y el
 * presupuesto de la sección 9 del spec (200 KB gzip iniciales) se rompe por 109 KB.
 *
 * Con `lazy`, el editor es un fragmento aparte que se descarga **al entrar en
 * /editor**. La portada, la biblioteca y los proyectos no pagan ese coste. Es la
 * corrección correcta y no un ajuste del límite: el problema real no era el
 * tamaño del bundle, era que se pedía antes de necesitarlo.
 *
 * El resto de rutas se quedan estáticas: son ligeras y aislarlas solo añadiría
 * un viaje de red sin ganancia.
 */
const EditorPage = lazy(() =>
  import('@/routes/editor/EditorPage').then((m) => ({ default: m.EditorPage })),
)
const LibraryPage = lazy(() =>
  import('@/routes/library/LibraryPage').then((m) => ({ default: m.LibraryPage })),
)
const ProjectsPage = lazy(() =>
  import('@/routes/projects/ProjectsPage').then((m) => ({ default: m.ProjectsPage })),
)
const SharedPage = lazy(() =>
  import('@/routes/shared/SharedPage').then((m) => ({ default: m.SharedPage })),
)

/**
 * Comparador de fondos. TEMPORAL — se elimina cuando la eleccion este hecha.
 * Va en diferido como el resto para no cargar nada en la landing.
 */
const BackdropLab = lazy(() =>
  import('@/routes/variantes/BackdropLab').then((m) => ({ default: m.BackdropLab })),
)

/**
 * Espera mientras se descarga un fragmento.
 *
 * Es un `div` con altura mínima en vez de un spinner: el salto de layout al
 * aparecer el contenido desplaza lo que el usuario esté leyendo, y una espera de
 * milisegundos no necesita un indicador animado que distraiga.
 */
function RouteFallback() {
  return <div className="min-h-[60dvh]" aria-busy="true" aria-live="polite" />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <LandingPage /> },
      {
        path: 'editor',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <EditorPage />
          </Suspense>
        ),
      },
      {
        path: 'biblioteca',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <LibraryPage />
          </Suspense>
        ),
      },
      {
        path: 'proyectos',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <ProjectsPage />
          </Suspense>
        ),
      },
      {
        path: 'compartido/:id',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <SharedPage />
          </Suspense>
        ),
      },
      {
        // Ruta de trabajo: comparador de fondos. Se elimina al decidir.
        path: 'variantes',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <BackdropLab />
          </Suspense>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
