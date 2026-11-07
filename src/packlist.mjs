import fs from 'node:fs'

export function checkPacklist({ manifest, references, add }, packlist) {
  if (!packlist) return
  try {
    if (fs.statSync(packlist).size > 8 * 1024 * 1024) throw new Error('Pack report exceeds 8 MiB.')
    const reports = JSON.parse(fs.readFileSync(packlist, 'utf8').replace(/^\uFEFF/, ''))
    if (!Array.isArray(reports)) throw new Error('Expected the JSON array returned by npm pack --dry-run --json --ignore-scripts.')
    const matching = reports.filter(row => row?.name === manifest.name && row?.version === manifest.version)
    if (matching.length !== 1) throw new Error('Pack report must contain exactly one entry with the audited package name and version. Regenerate it from this checkout.')
    const files = matching[0].files
    if (!Array.isArray(files) || files.some(row => typeof row?.path !== 'string')) throw new Error('Pack report files must contain path strings.')
    const normalize = name => name.replaceAll('\\', '/').replace(/^\.\//u, '')
    if (files.some(({ path }) => /^(?:[a-z][a-z\d+.-]*:|[\\/])/iu.test(path) || normalize(path).split('/').includes('..'))) {
      throw new Error('Pack report contains an absolute or parent-traversing path.')
    }
    const shipped = new Set(files.map(row => normalize(row.path)))
    for (const { file, field } of [{ file: 'package.json', field: 'manifest' }, ...references]) {
      if (!shipped.has(file)) add('pack.missing', `${field} references ${file}, but it is absent from npm's pack report. Check files/.npmignore and rebuild before packing.`, file)
    }
  } catch (error) {
    add('pack.report', `Cannot validate packed files: ${error.message}`)
  }
}
