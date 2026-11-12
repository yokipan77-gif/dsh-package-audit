import fs from 'node:fs'
import { parseDocument } from 'yaml'

/** Parse patch data without evaluating DSH's optional !!js expressions. */
export function checkPatches({ manifest, checkFile, add }) {
  const declared = manifest.dsh?.bundle?.patch
  const paths = Array.isArray(declared) ? declared : [declared]
  if (!paths.length || paths.some(p => typeof p !== 'string' || !p.trim())) return
  const seen = new Set()
  for (const declaredPath of paths) {
    const file = checkFile(declaredPath, 'dsh.bundle.patch')
    if (!file) continue
    if (seen.has(file.absolute)) {
      add('patch.duplicate', 'This patch file is declared more than once and would be applied repeatedly. Remove the duplicate unless repetition is intentional.', file.relative, 'warning')
      continue
    }
    seen.add(file.absolute)
    try {
      if (fs.statSync(file.absolute).size > 1024 * 1024) throw new Error('Patch exceeds the 1 MiB parser limit.')
      let dynamic = false
      const document = parseDocument(fs.readFileSync(file.absolute, 'utf8'), {
        customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: value => { dynamic = true; return value } }],
      })
      if (document.errors.length) throw new Error(document.errors[0].message)
      const data = document.toJS({ maxAliasCount: 50 })
      if (!Array.isArray(data)) throw new Error('A bundle patch must be a YAML sequence (an array of patch rows).')
      if (data.some(row => row === null || typeof row !== 'object' || Array.isArray(row))) {
        throw new Error('Each patch row must be a mapping, not a scalar or sequence.')
      }
      if (dynamic || document.warnings.length) {
        add('patch.dynamic', 'Patch contains dynamic expressions or unknown YAML tags. Static parsing cannot verify their runtime behavior.', file.relative, 'warning')
      }
    } catch (error) {
      add('patch.syntax', `Cannot parse patch: ${error.message}`, file.relative)
    }
  }
}
