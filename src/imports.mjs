import { exportPath } from './export-targets.mjs'
import { checkExportPattern } from './export-patterns.mjs'
import { checkExportMap, EXPORT_MAX_DEPTH } from './export-maps.mjs'

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
export function checkImports({ root, manifest, checkFile, add }) {
  if (manifest.imports === undefined) return
  if (!object(manifest.imports)) {
    add('imports.shape', 'imports must be an object mapping # names to package targets.')
    return
  }
  const visit = (value, field, pattern, depth = 0) => {
    if (depth > EXPORT_MAX_DEPTH || value === null) return
    if (typeof value === 'string') {
      if (value.startsWith('./')) {
        try {
          const target = exportPath(value)
          if (pattern && value.split(/[?#]/u, 1)[0].includes('*')) checkExportPattern(root, target, field, checkFile, add)
          else checkFile(target, field)
        } catch (error) { add('imports.target', `${field}: ${error.message}`) }
      } else if (!value.trim() || /^[.\\/]|^[a-z][a-z\d+.-]*:/iu.test(value)) {
        add('imports.target', `${field}: use a ./ local target or an external package specifier.`)
      } else add('imports.external', `${field} maps to an external package; package resolution is not evaluated.`, 'package.json', 'note')
    } else if (Array.isArray(value)) {
      add('imports.fallback', `${field}: fallback arrays need runtime resolution; static audit does not choose a target.`, 'package.json', 'note')
    } else if (object(value)) {
      for (const [key, target] of Object.entries(value)) visit(target, `${field}.${key}`, pattern, depth + 1)
    } else add('imports.target', `${field} must contain package targets, conditions, arrays or null.`)
  }
  for (const [key, value] of Object.entries(manifest.imports)) {
    const field = `imports.${key}`
    if (!key.startsWith('#') || key === '#' || key.startsWith('#/') || key.endsWith('/')) {
      add('imports.key', `${field}: import names must start with #, followed by a name without a leading or trailing slash.`)
      continue
    }
    checkExportMap(value, add, false, field)
    visit(value, field, key.includes('*'))
  }
}
