#!/usr/bin/env node
import { audit } from '../src/audit.mjs'
import { parseArgs } from '../src/arguments.mjs'
import { auditWorkspace } from '../src/workspaces.mjs'
import { allFindings, toSarif } from '../src/sarif.mjs'

let options
try { options = parseArgs(process.argv.slice(2)) } catch (error) {
  console.error(`${error.message}. Use --help.`)
  process.exit(2)
}
if (options.help) {
  console.log('Usage: dsh-package-audit [directory] [--workspace] [--json | --sarif] [--fail-on-warning] [--packlist report.json] [--dsh-version version] [--platform name]\nRead-only checks. Exit 0: no errors; 1: findings; 2: usage error.')
  process.exit(0)
}
const report = (options.workspace ? auditWorkspace : audit)(options.directory, options)
if (options.sarif) console.log(JSON.stringify(toSarif(report), null, 2))
else if (options.json) console.log(JSON.stringify(report, null, 2))
else {
  console.log(`${report.ok ? 'PASS' : 'FAIL'} ${report.name ?? report.root}`)
  for (const f of report.findings) console.log(`${f.severity}: ${f.code} (${f.file}) ${f.message}`)
  for (const pkg of report.packages ?? []) {
    console.log(`${pkg.ok ? 'PASS' : 'FAIL'} ${pkg.name ?? pkg.root}`)
    for (const f of pkg.findings) console.log(`${f.severity}: ${f.code} (${f.file}) ${f.message}`)
  }
}
process.exitCode = report.ok && !(options.failOnWarning && allFindings(report).some(f => f.severity === 'warning')) ? 0 : 1
