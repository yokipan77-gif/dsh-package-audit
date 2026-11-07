import fs from 'node:fs'
import path from 'node:path'

const EXTENSIONS = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp'])
export const ICON_MAX_BYTES = 256 * 1024

export function checkIcon({ manifest, checkFile, add }) {
  if (manifest.icon === undefined) return // Artwork is optional in the host contract.
  const file = checkFile(manifest.icon, 'icon')
  if (!file) return
  if (!EXTENSIONS.has(path.extname(file.relative).toLowerCase())) {
    add('icon.extension', 'The DSH Plugins page accepts SVG, PNG, JPEG or WebP. Export artwork in one of those formats.', file.relative)
  }
  const size = fs.statSync(file.absolute).size
  if (size > ICON_MAX_BYTES) add('icon.size', `Icon is ${size} bytes; DSH accepts at most ${ICON_MAX_BYTES}. Resize or compress it.`, file.relative)
  if (size === 0) add('icon.empty', 'The declared icon is empty. Add image content or remove the declaration.', file.relative)
}
