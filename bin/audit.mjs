#!/usr/bin/env node
import { audit } from '../src/audit.mjs'
import { parseArgs } from '../src/arguments.mjs'
import { auditWorkspace } from '../src/workspaces.mjs'
import { allFindings, toSarif } from '../src/sarif.mjs'
import { toText, writeReport } from '../src/output.mjs'
import { toMarkdown } from '../src/markdown.mjs'
import { readBounded } from '../src/stdin.mjs'
import { toNDJSON } from '../src/ndjson.mjs'

let options
try { options = parseArgs(process.argv.slice(2)) } catch (error) {
  console.error(`${error.message}. Use --help.`)
  process.exit(2)
}
if (options.help) {
  console.log('Usage: dsh-package-audit [directory] [--workspace [--include-root]] [--json | --sarif | --markdown | --ndjson] [--output file] [--fail-on-warning] [--publish-check] [--packlist report.json|-] [--max-unpacked-size bytes] [--dsh-version version] [--node-version version] [--platform name] [--arch name]\nRead-only checks; --output explicitly saves a report; --packlist - reads UTF-8 JSON from stdin. Exit 0: no errors; 1: findings; 2: usage/input/output error.')
  process.exit(0)
}
if (options.packlist === '-') {
  try { options.packlistContent = readBounded(0) } catch (error) {
    console.error(`Cannot read pack report: ${error.message}`)
    process.exit(2)
  }
}
const report = (options.workspace ? auditWorkspace : audit)(options.directory, options)
const rendered = options.sarif ? JSON.stringify(toSarif(report), null, 2) : options.json ? JSON.stringify(report, null, 2) : options.markdown ? toMarkdown(report) : options.ndjson ? toNDJSON(report) : toText(report)
try {
  if (options.output) writeReport(options.output, rendered, report, options.packlist === '-' ? undefined : options.packlist)
  else console.log(rendered)
} catch (error) {
  console.error(`Cannot save report: ${error.message}`)
  process.exit(2)
}
process.exitCode = report.ok && !(options.failOnWarning && allFindings(report).some(f => f.severity === 'warning')) ? 0 : 1
