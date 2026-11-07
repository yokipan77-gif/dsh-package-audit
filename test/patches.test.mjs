import test from 'node:test'
import assert from 'node:assert/strict'
import { audit } from '../src/audit.mjs'
import { fixture } from './helpers.mjs'

test('rejects malformed YAML, duplicate keys and non-sequence patch roots', t => {
  const f = fixture(t)
  for (const patch of ['[', 'insert: []', '- id: one\n  id: two', '- null', '- scalar']) {
    f.write('cordis.patch.yml', patch)
    assert.ok(audit(f.root).findings.some(f => f.code === 'patch.syntax'), patch)
  }
})
test('accepts overrides and insertion rows without inventing a full composer', t => {
  const f = fixture(t)
  f.write('cordis.patch.yml', '- id: existing\n  disabled: true\n- insert:\n    - id: new\n      name: example-plugin\n')
  assert.equal(audit(f.root).ok, true)
})
test('reports dynamic expressions without evaluating them', t => {
  const f = fixture(t)
  f.write('cordis.patch.yml', '- id: dynamic\n  disabled: !!js "process.exit(88)"\n')
  const report = audit(f.root)
  assert.equal(report.ok, true)
  assert.equal(report.findings[0].code, 'patch.dynamic')
})
