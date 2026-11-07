#!/usr/bin/env node
import { audit } from '../src/audit.mjs'
import { parseArgs } from '../src/arguments.mjs'

let options
try { options = parseArgs(process.argv.slice(2)) } catch (error) {
  console.error(`${error.message}. Use --help.`)
  process.exit(2)
}
if (options.help) {
  console.log('Usage: dsh-package-audit [directory] [--json] [--packlist report.json] [--dsh-version version] [--platform name]\nRead-only checks. Exit 0: no errors; 1: findings; 2: usage error.')
  process.exit(0)
}
const report = audit(options.directory, options)
if (options.json) console.log(JSON.stringify(report, null, 2))
else {
  console.log(`${report.ok ? 'PASS' : 'FAIL'} ${report.name ?? report.root}`)
  for (const f of report.findings) console.log(`${f.severity}: ${f.code} (${f.file}) ${f.message}`)
}
process.exitCode = report.ok ? 0 : 1
