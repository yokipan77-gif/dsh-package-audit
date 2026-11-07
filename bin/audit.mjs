#!/usr/bin/env node
import { audit } from '../src/audit.mjs'

const args = process.argv.slice(2)
if (args.includes('--help')) {
  console.log('Usage: dsh-package-audit [directory] [--json]\nRead-only checks for a DeepSeek Harness plugin package. Exit 0: no errors; 1: findings; 2: usage error.')
  process.exit(0)
}
const unknown = args.find(arg => arg.startsWith('-') && arg !== '--json')
const dirs = args.filter(arg => !arg.startsWith('-'))
if (unknown || dirs.length > 1) {
  console.error(`Invalid arguments: ${unknown ?? 'supply one directory'}. Use --help.`)
  process.exit(2)
}
const report = audit(dirs[0] ?? '.')
if (args.includes('--json')) console.log(JSON.stringify(report, null, 2))
else {
  console.log(`${report.ok ? 'PASS' : 'FAIL'} ${report.name ?? report.root}`)
  for (const f of report.findings) console.log(`${f.severity}: ${f.code} (${f.file}) ${f.message}`)
}
process.exitCode = report.ok ? 0 : 1
