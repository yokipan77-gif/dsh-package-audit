import test from 'node:test'
import assert from 'node:assert/strict'
import { audit } from '../src/audit.mjs'
import { fixture } from './helpers.mjs'

test('rejects mixed subpath/condition maps and integer condition keys', t => {
  for (const exports of [{ '.': './index.js', import: './index.js' }, { '.': { '0': './index.js', default: './index.js' } }, { '.': { import: { './nested': './index.js' } } }]) {
    const f = fixture(t, { exports })
    f.write('index.js', '')
    assert.equal(audit(f.root).ok, false)
  }
})
test('accepts nested named conditions and rejects invalid subpath keys', t => {
  const f = fixture(t, { exports: { '.': { node: { import: './index.js' }, default: './index.js' } } })
  f.write('index.js', '')
  assert.equal(audit(f.root).ok, true)
  f.manifest.exports = { './lib/../bad': './index.js' }
  f.write('package.json', JSON.stringify(f.manifest))
  assert.ok(audit(f.root).findings.some(f => f.code === 'entry.key'))
})
