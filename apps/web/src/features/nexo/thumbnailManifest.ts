/** Static assets only: this module deliberately never imports Three or the model factory. */
const assets = import.meta.glob<string>('../../assets/components/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
})

export const thumbnailManifest: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(assets).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -5), url]),
  ),
)

/** All current catalog entries are rendered; unknown future IDs keep the semantic fallback. */
export const unavailableThumbnailReasons: Readonly<Record<string, string>> = Object.freeze({})

export function resolveThumbnail(typeId: string): string | undefined {
  return Object.hasOwn(thumbnailManifest, typeId) ? thumbnailManifest[typeId] : undefined
}
