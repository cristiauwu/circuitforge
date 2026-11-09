import * as THREE from 'three'
import type { ModelTools } from '../modelParts'

type Point = [number, number, number]

/** Small construction vocabulary; all GPU resources remain owned by the model tools. */
export function familyTools(tools: ModelTools) {
  const { group, geometry, mesh, tube, anchors, solder } = tools
  const cylinder = (
    surface: THREE.Material,
    radius: number,
    height: number,
    x: number,
    y: number,
    z: number,
    name: string,
    segments = 32,
  ) =>
    mesh(
      group,
      geometry(new THREE.CylinderGeometry(radius, radius, height, segments)),
      surface,
      x,
      y,
      z,
      name,
    )
  const ring = (
    surface: THREE.Material,
    radius: number,
    thickness: number,
    x: number,
    y: number,
    z: number,
    name: string,
  ) => {
    const item = mesh(
      group,
      geometry(new THREE.TorusGeometry(radius, thickness, 8, 32)),
      surface,
      x,
      y,
      z,
      name,
    )
    item.rotation.x = Math.PI / 2
    return item
  }
  const lead = (pinId: string, start: Point, end: Point, bend?: Point) => {
    const middle = bend ?? [end[0], (start[1] + end[1]) / 2, end[2]]
    const terminal = tube(group, solder, [start, middle, end], 0.026, `Terminal ${pinId}`)
    terminal.userData.freeLead = true
    terminal.userData.pinId = pinId
    terminal.userData.bodyAnchor = [...start]
    anchors[pinId] = new THREE.Vector3(...end)
  }
  const marking = (value: string, width: number, depth: number, y: number, color = '#e7e4d9') =>
    tools.print(
      group,
      width,
      depth,
      y,
      tools.labelTexture(512, 128, (ctx) => {
        ctx.fillStyle = color
        ctx.font = 'bold 60px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(value, 256, 86)
      }),
    )
  return { cylinder, ring, lead, marking }
}
