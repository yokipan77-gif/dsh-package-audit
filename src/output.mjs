import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export function writeReport(filename, text, report, packlist) {
  const target = path.resolve(filename)
  const canonical = file => fs.existsSync(file) ? fs.realpathSync(file) : path.join(fs.realpathSync(path.dirname(file)), path.basename(file))
  const destination = canonical(target)
  const inputs = [report, ...(report.packages ?? [])].flatMap(pkg => ['package.json', ...(pkg.references ?? []).map(ref => ref.file)].map(file => path.join(pkg.root, file)))
  if (packlist) inputs.push(path.resolve(packlist))
  if (inputs.filter(file => fs.existsSync(file)).some(file => canonical(file) === destination)) throw new Error('Report output would overwrite an audited input. Choose a separate report file.')
  const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${randomUUID()}.tmp`)
  try {
    fs.writeFileSync(temporary, text + '\n', { encoding: 'utf8', mode: 0o600, flag: 'wx' })
    fs.renameSync(temporary, target)
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
  }
}

export function toText(report) {
  return [report, ...(report.packages ?? [])].flatMap(pkg => [
    `${pkg.ok ? 'PASS' : 'FAIL'} ${pkg.name ?? pkg.root}`,
    ...pkg.findings.map(f => `${f.severity}: ${f.code} (${f.file}) ${f.message}`),
  ]).join('\n')
}
