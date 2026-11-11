import path from 'node:path'
import { allFindings } from './sarif.mjs'

const cell = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/[\r\n]+/gu, ' ').replace(/[\\`*_[\]{}()#+!|]/gu, '\\$&')

export function toMarkdown(report) {
  const findings = allFindings(report)
  const errors = findings.filter(f => f.severity === 'error').length
  const warnings = findings.filter(f => f.severity === 'warning').length
  const lines = ['# DSH package audit', '', `Result: ${report.ok ? 'no errors' : 'errors found'}. ${errors} error(s), ${warnings} warning(s).`, '']
  if (!findings.length) return [...lines, 'No findings.'].join('\n')
  lines.push('| Level | Rule | File | Finding |', '| --- | --- | --- | --- |')
  for (const f of findings) {
    const file = path.relative(report.root, path.join(f.root, f.file)).split(path.sep).join('/')
    lines.push(`| ${cell(f.severity)} | ${cell(f.code)} | ${cell(file)} | ${cell(f.message)} |`)
  }
  return lines.join('\n')
}
