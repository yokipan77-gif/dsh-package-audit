import test from 'node:test'
import assert from 'node:assert/strict'
import { audit } from '../src/audit.mjs'
import { fixture } from './helpers.mjs'

test('private packages remain auditable locally but fail explicit publication checks', t => {
  const f = fixture(t, { private: true })
  assert.equal(audit(f.root).ok, true)
  assert.ok(audit(f.root, { publishCheck: true }).findings.some(f => f.code === 'publish.private'))
})
test('reports lifecycle script names without running or exposing their bodies', t => {
  const f = fixture(t, { scripts: { prepare: 'do-not-print-this-script' } })
  const report = audit(f.root, { publishCheck: true })
  assert.equal(report.ok, true)
  assert.equal(report.findings[0].code, 'publish.lifecycle')
  assert.equal(JSON.stringify(report).includes('do-not-print-this-script'), false)
})
test('validates publication access, tag and registry metadata', t => {
  const f = fixture(t, { publishConfig: { access: 'other', tag: '1.x', registry: 'ftp://example.test' } })
  assert.equal(audit(f.root, { publishCheck: true }).ok, false)
  f.manifest.publishConfig = { access: 'public', tag: 'next', registry: 'http://localhost:4873/' }
  f.write('package.json', JSON.stringify(f.manifest))
  assert.equal(audit(f.root, { publishCheck: true }).ok, true)
})
