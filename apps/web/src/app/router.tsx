import { lazy, Suspense } from 'react'
import { createBrowserRouter, Link } from 'react-router-dom'
import { LandingPage } from '@/routes/landing/LandingPage'
import { NotFoundPage } from '@/routes/not-found/NotFoundPage'
import { AppShell } from './AppShell'

// Routes and the Three engine are separate progressive imports; neither blocks the shell.
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

function RouteFallback() {
  return (
    <div className="nx-route-loading" role="status" aria-busy="true">
      Abriendo el espacio…
    </div>
  )
}

function RouteError() {
  return (
    <section className="nx-page nx-not-found" aria-labelledby="route-error-title">
      <h1 id="route-error-title">No pudimos abrir este espacio.</h1>
      <p>
        El archivo de la página no está disponible o se produjo un error. Puedes volver al inicio
        sin recargar.
      </p>
      <Link className="nx-button" to="/">
        Volver al inicio
      </Link>
      <p className="nx-muted">
        Recargar puede resolver una actualización pendiente, pero perderás el proyecto y los
        borradores de esta sesión.
      </p>
      <button type="button" className="nx-button" onClick={() => window.location.reload()}>
        Recargar la aplicación
      </button>
    </section>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: (
      <div className="nexo-app">
        <RouteError />
      </div>
    ),
    children: [
      { index: true, element: <LandingPage />, errorElement: <RouteError /> },
      {
        path: 'editor',
        errorElement: <RouteError />,
        element: (
          <Suspense fallback={<RouteFallback />}>
            <EditorPage />
          </Suspense>
        ),
      },
      {
        path: 'biblioteca',
        errorElement: <RouteError />,
        element: (
          <Suspense fallback={<RouteFallback />}>
            <LibraryPage />
          </Suspense>
        ),
      },
      {
        path: 'proyectos',
        errorElement: <RouteError />,
        element: (
          <Suspense fallback={<RouteFallback />}>
            <ProjectsPage />
          </Suspense>
        ),
      },
      {
        path: 'compartido/:id',
        errorElement: <RouteError />,
        element: (
          <Suspense fallback={<RouteFallback />}>
            <SharedPage />
          </Suspense>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
