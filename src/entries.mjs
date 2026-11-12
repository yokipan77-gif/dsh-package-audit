import { checkExportPattern } from './export-patterns.mjs'
import { exportPath } from './export-targets.mjs'
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)

export function checkEntries({ root, manifest, checkFile, add }) {
  for (const key of ['main', 'module', 'types', 'typings']) {
    if (manifest[key] !== undefined) checkFile(manifest[key], key)
  }
  const bins = typeof manifest.bin === 'string' ? [manifest.bin] : object(manifest.bin) ? Object.values(manifest.bin) : []
  if (manifest.bin !== undefined && typeof manifest.bin !== 'string' && !object(manifest.bin)) add('entry.bin', 'bin must be a file path or command-to-path object.')
  for (const bin of bins) checkFile(bin, 'bin')

  function visit(value, field) {
    if (value === null) return // Explicitly blocked export.
    if (typeof value === 'string') {
      let target
      try { target = exportPath(value) } catch (error) { add('entry.export', `${field}: ${error.message}`); return }
      if (value.includes('*')) {
        checkExportPattern(root, target, field, checkFile, add)
      } else checkFile(target, field)
    } else if (Array.isArray(value)) {
      // Node permits a fallback list. Report each missing candidate as advisory,
      // since a later condition/target can still be valid at runtime.
      add('entry.fallback', `${field}: fallback arrays need runtime resolution; static audit does not choose a target.`, 'package.json', 'note')
    } else if (object(value)) {
      for (const [key, target] of Object.entries(value)) visit(target, `${field}.${key}`)
    } else add('entry.export', `${field} must contain export paths, conditions, arrays or null.`)
  }
  if (manifest.exports !== undefined) visit(manifest.exports, 'exports')

  const client = manifest.dsh?.client
  if (client !== undefined) {
    if (!object(client)) { add('client.object', 'dsh.client must be an object.'); return }
    if (typeof client.platform !== 'string' || !client.platform.trim()) add('client.platform', 'Declare a non-empty dsh.client.platform (for example web).')
    for (const key of ['inject', 'external']) {
      if (client[key] !== undefined && (!Array.isArray(client[key]) || client[key].some(v => typeof v !== 'string' || !v.trim()))) {
        add(`client.${key}`, `dsh.client.${key} must be an array of non-empty module names.`)
      }
    }
    if (client.immediately !== undefined && typeof client.immediately !== 'boolean') add('client.immediately', 'dsh.client.immediately must be a boolean.')
  }
}
