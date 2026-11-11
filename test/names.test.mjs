import test from 'node:test'
import assert from 'node:assert/strict'
import { audit } from '../src/audit.mjs'
import { fixture } from './helpers.mjs'

test('rejects package names npm cannot install while preserving scoped names', t => {
  for (const name of ['bad name', '.hidden', 'node_modules', '@scope/']) {
    const f = fixture(t, { name })
    assert.ok(audit(f.root).findings.some(f => f.code === 'name.invalid'), name)
  }
  const f = fixture(t, { name: '@scope/valid-plugin' })
  assert.equal(audit(f.root).ok, true)
})
test('reports legacy npm names as warnings instead of refusing existing packages', t => {
  const f = fixture(t, { name: 'OldPlugin' })
  const report = audit(f.root)
  assert.equal(report.ok, true)
  assert.equal(report.findings[0].code, 'name.legacy')
})
