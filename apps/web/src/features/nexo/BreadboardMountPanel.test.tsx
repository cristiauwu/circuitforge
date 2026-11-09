import {
  COMPONENT_INDEX,
  type Component,
  createEmptyProject,
  type Project,
} from '@circuitforge/netlist'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { BreadboardMountPanel, previewBreadboardMount } from './BreadboardMountPanel'

function instance(typeId: string, id: string): Component {
  const definition = COMPONENT_INDEX.get(typeId)
  if (!definition) throw new Error(typeId)
  return {
    id,
    typeId,
    position: { x: 0, y: 0, rotation: 0 },
    params: {},
    pins: definition.pins.map((pin) => ({ pinId: pin.id, type: pin.type, netId: null })),
  }
}
function setup(typeId = 'resistor') {
  const component = instance(typeId, 'P1')
  const project: Project = {
    ...createEmptyProject('test', 'Montaje de prueba'),
    components: [instance('breadboard', 'BB1'), component],
  }
  return { component, project }
}

describe('explicit breadboard insertion UI', () => {
  it.each([
    'resistor',
    'led',
    'diode',
    'capacitor',
    'capacitor_ceramic',
    'inductor',
    'ldr',
    'bjt_npn',
  ])('previews every complete %s footprint without changing the project', (typeId) => {
    const { component, project } = setup(typeId)
    const before = JSON.stringify(project)
    const preview = previewBreadboardMount(project, component.id, 'BB1', 'a1', 0)
    expect(preview.mount?.contacts).toHaveLength(component.pins.length)
    expect(JSON.stringify(project)).toBe(before)
    const onMount = vi.fn(() => ({ ok: true }))
    const markup = renderToStaticMarkup(
      <BreadboardMountPanel
        project={project}
        component={component}
        onMount={onMount}
        onUnmount={() => ({ ok: true })}
      />,
    )
    expect(markup).toContain('Insertar')
    expect(markup).toContain('Contactos previstos')
    expect(markup.match(/<select /g)).toHaveLength(5)
    expect(markup.match(/<option /g)?.length).toBeLessThan(50)
    expect(onMount).not.toHaveBeenCalled()
  })

  it('shows occupancy and off-board errors using pure domain validation', () => {
    const { component, project } = setup()
    const occupying = instance('led', 'D1')
    project.components.push(occupying)
    const mount = previewBreadboardMount(project, 'D1', 'BB1', 'a1', 0).mount
    if (!mount) throw new Error('Missing valid mount')
    project.mounts = [mount]
    expect(previewBreadboardMount(project, component.id, 'BB1', 'a1', 0).error).toMatch(/ocupado/)
    expect(previewBreadboardMount(project, component.id, 'BB1', 'a30', 0).error).toMatch(/fuera/)
    expect(project.mounts).toHaveLength(1)
  })

  it('renders exact mounted pin contacts, reposition/extract and follow-board guidance', () => {
    const { component, project } = setup()
    const mount = previewBreadboardMount(project, component.id, 'BB1', 'a1', 0).mount
    if (!mount) throw new Error('Missing valid mount')
    project.mounts = [mount]
    const markup = renderToStaticMarkup(
      <BreadboardMountPanel
        project={project}
        component={component}
        onMount={() => ({ ok: true })}
        onUnmount={() => ({ ok: true })}
      />,
    )
    expect(markup).toContain('Insertado en BB1')
    expect(markup).toContain('P1.a → BB1.a1')
    expect(markup).toContain('P1.b → BB1.a6')
    expect(markup).toContain('Recolocar')
    expect(markup).toContain('Extraer')
    expect(markup).toContain('esta pieza la sigue')
    expect(markup).toContain('disabled=""')
  })

  it('offers a recovery when there is no board and does not offer unsupported insertion', () => {
    const { component, project } = setup()
    project.components = [component]
    const props = {
      project,
      component,
      onMount: () => ({ ok: true }),
      onUnmount: () => ({ ok: true }),
    }
    expect(renderToStaticMarkup(<BreadboardMountPanel {...props} />)).toContain(
      'Añade una protoboard',
    )
    expect(
      renderToStaticMarkup(<BreadboardMountPanel {...props} component={instance('esp32', 'U1')} />),
    ).toBe('')
  })
})
