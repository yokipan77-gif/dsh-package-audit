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
  const extension = path.extname(file.relative).toLowerCase()
  if (size > 0 && ['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) {
    const header = Buffer.alloc(12)
    const descriptor = fs.openSync(file.absolute, 'r')
    let count
    try { count = fs.readSync(descriptor, header, 0, header.length, 0) } finally { fs.closeSync(descriptor) }
    const valid = extension === '.png'
      ? count >= 8 && header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : extension === '.webp'
        ? count >= 12 && header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP'
        : count >= 3 && header[0] === 255 && header[1] === 216 && header[2] === 255
    if (!valid) add('icon.signature', `The file header does not match ${extension}. Export the image in the declared format.`, file.relative)
  }
}
