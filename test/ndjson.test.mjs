import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { audit } from '../src/audit.mjs'
import { auditWorkspace } from '../src/workspaces.mjs'
import { toNDJSON } from '../src/reports.mjs'
import { parseArgs } from '../src/arguments.mjs'
import { fixture } from './helpers.mjs'

const cli = fileURLToPath(new URL('../bin/audit.mjs', import.meta.url))
test('NDJSON preserves Unicode and embedded newlines within a single record', t => {
  const { root } = fixture(t)
  const report = audit(root)
  report.findings.push({ code: 'sample', severity: 'note', file: '文件.yml', message: 'first\nsecond' })
  const text = toNDJSON(report)
  assert.equal(text.split('\n').length, 1)
  assert.deepEqual(JSON.parse(text), { type: 'package', ...report })
})

test('workspace NDJSON emits summary followed by ordered complete package reports', t => {
  const { root } = fixture(t, { workspaces: ['.'] })
  const report = auditWorkspace(root)
  const records = toNDJSON(report).split('\n').map(line => JSON.parse(line))
  assert.equal(records.length, report.packages.length + 1)
  assert.equal(records[0].type, 'workspace')
  assert.equal(records[0].packageCount, 1)
  assert.equal('packages' in records[0], false)
  assert.deepEqual(records[1], { type: 'package', ...report.packages[0] })
  const result = spawnSync(process.execPath, [cli, root, '--workspace', '--ndjson'], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(result.stdout.trim().split('\n').map(line => JSON.parse(line)), records)
})

test('NDJSON is exclusive with all other structured output formats', () => {
  for (const format of ['--json', '--sarif', '--markdown']) {
    assert.throws(() => parseArgs(['--ndjson', format]), /Choose one/u)
  }
})
