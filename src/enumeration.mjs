import fs from 'node:fs'
import path from 'node:path'

/** Bound traversal while reading directory entries, before collecting/sorting files. */
export function packageFiles(root, limit = 20_000) {
  const pending = ['']
  const files = []
  let examined = 0
  while (pending.length) {
    const relative = pending.pop()
    const directory = fs.opendirSync(path.join(root, relative))
    try {
      let entry
      while ((entry = directory.readSync()) !== null) {
        if (++examined > limit) throw new Error(`Artifact enumeration exceeded ${limit} filesystem entries; narrow the package before auditing.`)
        if (entry.name === 'node_modules' || entry.name === '.git') continue
        const file = relative ? `${relative}/${entry.name}` : entry.name
        if (entry.isDirectory()) pending.push(file)
        else if (entry.isFile()) files.push(file)
        else if (entry.isSymbolicLink()) {
          // Never descend into directory aliases. A matched file link is still
          // checked by packageFile for real-path containment.
          try { if (fs.statSync(path.join(root, file)).isFile()) files.push(file) } catch {}
        }
      }
    } finally { directory.closeSync() }
  }
  return files.sort()
}
