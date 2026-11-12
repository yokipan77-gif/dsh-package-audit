import test from 'node:test'
import assert from 'node:assert/strict'
import { audit } from '../src/audit.mjs'
import { fixture } from './helpers.mjs'

test('finds missing browser builds and records successful browser artifacts', t => {
  const f = fixture(t, { browser: './dist/browser.js' })
  assert.equal(audit(f.root).ok, false)
  f.write('dist/browser.js', 'export const browser = true')
  const report = audit(f.root)
  assert.equal(report.ok, true)
  assert.ok(report.references.some(ref => ref.file === 'dist/browser.js'))
})
test('handles false replacements and distinguishes local files from dependency aliases', t => {
  const f = fixture(t, { browser: { fs: false, './server.js': './client.js', 'node-fetch': 'cross-fetch' } })
  f.write('client.js', '')
  const report = audit(f.root)
  assert.equal(report.ok, true)
  assert.deepEqual(report.findings.map(f => f.code), ['browser.external'])
})
test('rejects malformed replacement maps and escaping local replacements', t => {
  for (const browser of [[], { server: null }, { './server.js': '../outside.js' }]) {
    const f = fixture(t, { browser })
    assert.equal(audit(f.root).ok, false)
  }
})
