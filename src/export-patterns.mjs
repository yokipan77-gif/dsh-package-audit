import fs from 'node:fs'
import { packagePath } from './files.mjs'

export function checkExportPattern(root, target, field, checkFile, add) {
  try {
    packagePath(root, target)
    if (target.includes('\\') || target.split('/').includes('node_modules')) throw new Error('Export targets must use forward slashes and cannot point into node_modules.')
    const pieces = target.slice(2).split('*').map(piece => piece.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
    const expression = new RegExp(`^${pieces[0]}(.*)${pieces.slice(1).join('\\1')}$`, 'u')
    let examined = 0
    let matched = 0
    const candidates = fs.globSync('**/*', { cwd: root, exclude: ['**/node_modules/**', '**/.git/**'] }).map(file => file.replaceAll('\\', '/')).sort()
    for (const file of candidates) {
      if (++examined > 20_000) throw new Error('Export enumeration exceeded 20000 filesystem entries; narrow the package before auditing.')
      if (!expression.test(file.replaceAll('\\', '/'))) continue
      matched++
      checkFile(file, field)
    }
    if (!matched) add('entry.pattern.empty', `${field}: no local artifacts match ${target}. Build the files or correct the export pattern.`)
  } catch (error) { add('entry.pattern.invalid', `${field}: ${error.message}`) }
}
