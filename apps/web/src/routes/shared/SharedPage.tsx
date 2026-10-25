import { Link, useParams } from 'react-router-dom'
import { findProject, formatRelative } from '@/lib/fixtures/projects'
import { Button, Panel, PanelTitle, ViolationMessage } from '@/ui'

/**
 * Proyecto compartido (documento de diseño sección 4).
 *
 * Modo Read: se ve el circuito pero no se edita. Es la pantalla que hace útil
 * compartir un enlace, y no necesita backend para existir en esta etapa.
 */
export function SharedPage() {
  const { id } = useParams<{ id: string }>()
  const project = id ? findProject(id) : undefined

  if (!project) {
    return <NotFoundProject id={id} />
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-2xs uppercase tracking-wide text-text-muted">
            Proyecto compartido
          </p>
          <h1 className="mb-1 text-xl font-semibold tracking-tight text-text">{project.name}</h1>
          <p className="text-sm text-text-secondary">{project.summary}</p>
        </div>

        <Button plain variant="secondary" disabled title="Requiere el backend">
          Duplicar en mis proyectos
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Vista del circuito, en solo lectura */}
        <div className="relative min-h-[420px] overflow-hidden rounded-md border border-hairline bg-bg">
          <div aria-hidden="true" className="cf-grid-bg cf-grid-fade absolute inset-0 opacity-70" />
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="max-w-[36ch] text-center text-sm text-text-muted">
              La vista del circuito se renderiza aquí cuando el lienzo lea el netlist.
            </p>
          </div>
          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-sm border border-hairline bg-surface/80 px-2.5 py-1">
            <span className="size-1.5 rounded-full bg-text-muted" aria-hidden="true" />
            <span className="text-2xs text-text-secondary">Solo lectura</span>
          </div>
        </div>

        {/* Metadatos */}
        <div className="flex flex-col gap-3">
          <Panel>
            <PanelTitle>Detalles</PanelTitle>
            <dl className="flex flex-col gap-2.5">
              <Detail label="Componentes" value={String(project.componentCount)} />
              <Detail label="Nets" value={String(project.netCount)} />
              <Detail label="Actualizado" value={formatRelative(project.updatedAt)} />
              <Detail label="Permisos" value={project.owned ? 'Editable' : 'Solo lectura'} />
            </dl>
          </Panel>

          <Panel>
            <PanelTitle>Estado</PanelTitle>
            <ViolationMessage
              severity="success"
              message="El circuito no tiene conexiones inválidas."
            />
          </Panel>

          <Link
            to="/proyectos"
            viewTransition
            className="text-sm font-medium text-accent no-underline hover:text-accent-hover"
          >
            Volver a mis proyectos
          </Link>
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="cf-mono text-sm text-text">{value}</dd>
    </div>
  )
}

/** Proyecto inexistente: error explicito con salida, no una pantalla en blanco. */
function NotFoundProject({ id }: { id?: string | undefined }) {
  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="text-xl font-semibold text-text">Ese proyecto no existe</h1>
      <p className="text-sm text-text-secondary">
        {id ? (
          <>
            No hay ningún proyecto con el identificador{' '}
            <span className="cf-mono text-text">{id}</span>.
          </>
        ) : (
          'Falta el identificador del proyecto en el enlace.'
        )}
      </p>
      <Link
        to="/proyectos"
        viewTransition
        className="text-sm font-medium text-accent no-underline hover:text-accent-hover"
      >
        Ver mis proyectos
      </Link>
    </div>
  )
}
