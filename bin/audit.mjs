#!/usr/bin/env node
import { audit } from '../src/audit.mjs'
import { parseArgs } from '../src/arguments.mjs'
import { auditWorkspace } from '../src/workspaces.mjs'
import { allFindings, toSarif } from '../src/sarif.mjs'
import { toText, writeReport } from '../src/output.mjs'
import { toMarkdown } from '../src/markdown.mjs'

let options
try { options = parseArgs(process.argv.slice(2)) } catch (error) {
  console.error(`${error.message}. Use --help.`)
  process.exit(2)
}
if (options.help) {
  console.log('Usage: dsh-package-audit [directory] [--workspace] [--json | --sarif | --markdown] [--output file] [--fail-on-warning] [--packlist report.json] [--max-unpacked-size bytes] [--dsh-version version] [--platform name]\nRead-only checks; --output explicitly saves a report. Exit 0: no errors; 1: findings; 2: usage/output error.')
  process.exit(0)
}
const report = (options.workspace ? auditWorkspace : audit)(options.directory, options)
const rendered = options.sarif ? JSON.stringify(toSarif(report), null, 2) : options.json ? JSON.stringify(report, null, 2) : options.markdown ? toMarkdown(report) : toText(report)
try {
  if (options.output) writeReport(options.output, rendered, report, options.packlist)
  else console.log(rendered)
} catch (error) {
  console.error(`Cannot save report: ${error.message}`)
  process.exit(2)
}
process.exitCode = report.ok && !(options.failOnWarning && allFindings(report).some(f => f.severity === 'warning')) ? 0 : 1
