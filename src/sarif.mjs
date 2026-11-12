import path from 'node:path'
import fs from 'node:fs'
import { createHash } from 'node:crypto'

const metadata = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
export function allFindings(report) {
  return [report, ...(report.packages ?? [])].flatMap(pkg => pkg.findings.map(f => ({ ...f, root: pkg.root })))
}

/** SARIF 2.1.0 output with package-relative, URI-encoded artifact locations. */
export function toSarif(report) {
  const findings = allFindings(report)
  const codes = [...new Set(findings.map(f => f.code))].sort()
  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [{
      tool: { driver: {
        name: 'dsh-package-audit', version: metadata.version,
        informationUri: 'https://github.com/yokipan77-gif/dsh-package-audit',
        rules: codes.map(id => ({ id, shortDescription: { text: id } })),
      } },
      results: findings.map(f => {
        const relative = path.relative(report.root, path.join(f.root, f.file)).split(path.sep).join('/')
        return {
          ruleId: f.code, ruleIndex: codes.indexOf(f.code), level: f.severity,
          partialFingerprints: { 'dshFinding/v1': createHash('sha256').update(JSON.stringify([f.code, relative, f.message])).digest('hex') },
          message: { text: f.message },
          locations: [{ physicalLocation: { artifactLocation: { uri: relative.split('/').map(encodeURIComponent).join('/') } } }],
        }
      }),
    }],
  }
}
