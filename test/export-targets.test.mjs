import test from 'node:test'
import assert from 'node:assert/strict'
import { audit } from '../src/audit.mjs'
import { fixture } from './helpers.mjs'

test('checks encoded export filenames after removing URL query and fragment', t => {
  const f = fixture(t, { exports: './lib/a%20b.mjs?build=1#module' })
  f.write('lib/a b.mjs', 'export const value = 1')
  const report = audit(f.root)
  assert.equal(report.ok, true)
  assert.ok(report.references.some(ref => ref.file === 'lib/a b.mjs'))
})
test('rejects Node-invalid export segments even when a local file exists', t => {
  for (const target of ['./lib/../index.js', './node_modules/x.js', './%2e/index.js', './lib%2findex.js', './lib/%ZZ.js']) {
    const f = fixture(t, { exports: target })
    f.write('index.js', '')
    assert.ok(audit(f.root).findings.some(f => f.code === 'entry.export'), target)
  }
})
