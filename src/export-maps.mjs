import { exportPath } from './export-targets.mjs'

export const EXPORT_MAX_DEPTH = 64
export function checkExportMap(value, add, top = true, field = 'exports', depth = 0) {
  if (depth > EXPORT_MAX_DEPTH) {
    add('entry.depth', `Export declarations exceed the ${EXPORT_MAX_DEPTH}-level static analysis limit.`)
    return
  }
  if (Array.isArray(value)) {
    for (const target of value) checkExportMap(target, add, false, field, depth + 1)
    return
  }
  if (value === null || typeof value !== 'object') return
  const keys = Object.keys(value)
  const paths = keys.filter(key => key.startsWith('.'))
  if (paths.length && (!top || paths.length !== keys.length)) {
    add('entry.map', `${field} mixes subpath keys and conditions, or nests subpaths inside conditions. Use a top-level subpath map with condition objects as values.`)
    return
  }
  for (const key of keys) {
    if (paths.length) {
      try { if (key !== '.') exportPath(key) } catch (error) { add('entry.key', `${field} key ${key}: ${error.message}`) }
    } else if (!key || (/^(0|[1-9]\d*)$/u.test(key) && Number(key) < 4294967295)) {
      add('entry.condition', `${field} has an empty or integer condition key. Use named conditions such as import, require or default.`)
    }
    checkExportMap(value[key], add, false, `${field}.${key}`, depth + 1)
  }
}
