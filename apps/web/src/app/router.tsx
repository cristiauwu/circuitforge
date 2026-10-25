import { createBrowserRouter } from 'react-router-dom'
import { EditorPage } from '@/routes/editor/EditorPage'
import { LandingPage } from '@/routes/landing/LandingPage'
import { LibraryPage } from '@/routes/library/LibraryPage'
import { NotFoundPage } from '@/routes/not-found/NotFoundPage'
import { ProjectsPage } from '@/routes/projects/ProjectsPage'
import { SharedPage } from '@/routes/shared/SharedPage'
import { AppShell } from './AppShell'

/**
 * Rutas del shell (documento de diseño sección 4).
 *
 * Las transiciones entre rutas usan la API nativa View Transitions, que React
 * Router 7 expone con `viewTransition` en los `<Link>`. Sin dependencia
 * adicional: el navegador que no la soporta cambia de ruta sin animar, que es
 * una degradacion limpia y no un fallo.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'editor', element: <EditorPage /> },
      { path: 'biblioteca', element: <LibraryPage /> },
      { path: 'proyectos', element: <ProjectsPage /> },
      { path: 'compartido/:id', element: <SharedPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
