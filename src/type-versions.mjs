import semver from 'semver'
import { packagePath } from './files.mjs'
import { checkExportPattern } from './export-patterns.mjs'

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
/** Check declared artifacts without choosing a TypeScript version or fallback. */
export function checkTypeVersions({ root, manifest, checkFile, add }) {
  if (manifest.typesVersions === undefined) return
  if (!object(manifest.typesVersions)) {
    add('types.versions', 'typesVersions must map compiler SemVer ranges to path mappings.')
    return
  }
  for (const [range, mappings] of Object.entries(manifest.typesVersions)) {
    if (!range.trim() || semver.validRange(range) === null) add('types.range', `Invalid typesVersions compiler range: ${range}.`)
    if (!object(mappings)) {
      add('types.mapping', `typesVersions.${range} must contain a path mapping object.`)
      continue
    }
    for (const [request, targets] of Object.entries(mappings)) {
      const field = `typesVersions.${range}.${request}`
      if (!request || (request.match(/\*/gu) ?? []).length > 1 || !Array.isArray(targets) || !targets.length || targets.some(target => typeof target !== 'string' || !target.trim() || (target.match(/\*/gu) ?? []).length > 1)) {
        add('types.mapping', `${field} must map a path with at most one wildcard to a non-empty array of target paths with at most one wildcard.`)
        continue
      }
      let safe = true
      for (const target of targets) {
        try { packagePath(root, target) } catch (error) {
          safe = false
          add('types.target', `${field}: ${error.message}`)
        }
      }
      if (!safe) continue
      if (targets.length > 1) {
        add('types.fallback', `${field}: alternative targets require TypeScript resolution; no candidate is selected.`, 'package.json', 'note')
        continue
      }
      const target = targets[0].replaceAll('\\', '/')
      if (request.includes('*') && target.includes('*')) {
        checkExportPattern(root, target.startsWith('./') ? target : `./${target}`, field, checkFile, add)
      } else if (/\.d\.(?:ts|mts|cts)$/u.test(target)) checkFile(target, field)
      else add('types.resolution', `${field}: extension substitution or directory resolution requires TypeScript; this target is not verified.`, 'package.json', 'note')
    }
  }
}
