import { type Component, type Project, resolveMountedPose } from '@circuitforge/netlist'
import { projectRotationToWorld, projectToWorld } from './editorProjection'

export interface InstancePreview {
  componentId: string
  position: Readonly<{ x: number; y: number }>
}

/** Shared instance authority for body, terminal, picking and bounds transforms. */
export function resolveInstancePose(
  project: Project,
  component: Component,
  preview?: InstancePreview | null,
) {
  const posed = preview
    ? {
        ...project,
        components: project.components.map((item) =>
          item.id === preview.componentId
            ? { ...item, position: { ...item.position, ...preview.position } }
            : item,
        ),
      }
    : project
  const mounted = resolveMountedPose(posed, component.id)
  const free = posed.components.find((item) => item.id === component.id) ?? component
  const position = projectToWorld(mounted ?? free.position)
  return {
    ...position,
    y: mounted?.elevation ?? free.elevation ?? 0,
    rotation: projectRotationToWorld(mounted?.rotation ?? free.position.rotation),
  }
}
