import { packagePath } from './files.mjs'
import { packageFiles } from './enumeration.mjs'

export function checkExportPattern(root, target, field, checkFile, add) {
  try {
    packagePath(root, target)
    if (target.includes('\\') || target.split('/').includes('node_modules')) throw new Error('Export targets must use forward slashes and cannot point into node_modules.')
    const pieces = target.slice(2).split('*').map(piece => piece.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
    const expression = new RegExp(`^${pieces[0]}(.*)${pieces.slice(1).join('\\1')}$`, 'u')
    let matched = 0
    const candidates = packageFiles(root)
    for (const file of candidates) {
      if (!expression.test(file.replaceAll('\\', '/'))) continue
      matched++
      checkFile(file, field)
    }
    if (!matched) add('entry.pattern.empty', `${field}: no local artifacts match ${target}. Build the files or correct the export pattern.`)
  } catch (error) { add('entry.pattern.invalid', `${field}: ${error.message}`) }
}
