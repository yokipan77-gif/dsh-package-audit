import fs from 'node:fs'
import path from 'node:path'

export function checkPacklist({ root, manifest, references, add }, packlist, options = {}) {
  if (!packlist && options.packlistContent === undefined) {
    if (options.maxUnpackedSize !== undefined) add('pack.budget.report', 'A size budget requires a pack report with per-file sizes.')
    return
  }
  try {
    let content = options.packlistContent
    if (content === undefined) {
      if (fs.statSync(packlist).size > 8 * 1024 * 1024) throw new Error('Pack report exceeds 8 MiB.')
      content = fs.readFileSync(packlist, 'utf8')
    }
    if (typeof content !== 'string' || Buffer.byteLength(content) > 8 * 1024 * 1024) throw new Error('Pack report must be UTF-8 JSON text of at most 8 MiB.')
    const reports = JSON.parse(content.replace(/^\uFEFF/, ''))
    if (!Array.isArray(reports)) throw new Error('Expected the JSON array returned by npm pack --dry-run --json --ignore-scripts.')
    const matching = reports.filter(row => row?.name === manifest.name && row?.version === manifest.version)
    if (matching.length !== 1) throw new Error('Pack report must contain exactly one entry with the audited package name and version. Regenerate it from this checkout.')
    const files = matching[0].files
    if (!Array.isArray(files) || files.some(row => typeof row?.path !== 'string')) throw new Error('Pack report files must contain path strings.')
    const normalize = name => path.posix.normalize(name.replaceAll('\\', '/'))
    if (files.some(({ path }) => /^(?:[a-z][a-z\d+.-]*:|[\\/])/iu.test(path) || path.replaceAll('\\', '/').split('/').includes('..'))) {
      throw new Error('Pack report contains an absolute or parent-traversing path.')
    }
    if (files.some(row => !row.path || /[\\/]$/u.test(row.path) || normalize(row.path) === '.')) throw new Error('Pack report paths must name files, not empty paths or directories.')
    const shipped = new Set(files.map(row => normalize(row.path)))
    if (shipped.size !== files.length) throw new Error('Pack report repeats a file path; regenerate the report with npm.')
    if (files.some(row => row.size !== undefined && (!Number.isSafeInteger(row.size) || row.size < 0))) throw new Error('Pack report file sizes must be non-negative integers.')
    if (options.maxUnpackedSize !== undefined) {
      if (!Number.isSafeInteger(options.maxUnpackedSize) || options.maxUnpackedSize < 0) throw new Error('Size budget must be a non-negative integer byte count.')
      if (files.some(row => row.size === undefined)) throw new Error('Every file needs a size to evaluate the unpacked-size budget.')
      const total = files.reduce((sum, row) => sum + row.size, 0)
      if (!Number.isSafeInteger(total)) throw new Error('Total packed-file size exceeds the integer precision limit.')
      if (total > options.maxUnpackedSize) add('pack.budget', `Unpacked size ${total} bytes exceeds the ${options.maxUnpackedSize}-byte budget. Remove unneeded files or adjust the budget.`)
    }
    const sizes = new Map(files.map(row => [normalize(row.path), row.size]))
    const checked = new Set()
    for (const { file, field } of [{ file: 'package.json', field: 'manifest' }, ...references.filter(ref => ref.packed !== false)]) {
      if (checked.has(file)) continue
      checked.add(file)
      if (!shipped.has(file)) add('pack.missing', `${field} references ${file}, but it is absent from npm's pack report. Check files/.npmignore and rebuild before packing.`, file)
      else if (file !== 'package.json' && sizes.get(file) !== undefined && fs.statSync(path.join(root, file)).size !== sizes.get(file)) {
        add('pack.stale', `Local size of ${file} differs from the pack report. Regenerate the report after rebuilding.`, file, 'warning')
      }
    }
  } catch (error) {
    add('pack.report', `Cannot validate packed files: ${error.message}`)
  }
}
