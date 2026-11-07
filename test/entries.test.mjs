import test from 'node:test'
import assert from 'node:assert/strict'
import { audit } from '../src/audit.mjs'
import { fixture } from './helpers.mjs'

test('checks emitted conditional exports and reports missing build output', t => {
  const f = fixture(t, { exports: { '.': { import: './dist/index.mjs', types: './dist/index.d.ts' }, './private': null } })
  assert.equal(audit(f.root).findings.filter(f => f.code === 'file.invalid').length, 2)
  f.write('dist/index.mjs', 'throw new Error("never execute me")')
  f.write('dist/index.d.ts', 'export const name: string')
  assert.equal(audit(f.root).ok, true)
})
test('respects blocked exports and discloses unresolved patterns and fallbacks', t => {
  const f = fixture(t, { exports: { './hidden': null, './locale/*': './locale/*.json', '.': ['./optional.js', './fallback.js'] } })
  const report = audit(f.root)
  assert.equal(report.ok, true)
  assert.deepEqual(report.findings.map(f => f.code), ['entry.pattern', 'entry.fallback'])
})
test('validates declared CLI binaries and client fields', t => {
  const f = fixture(t, { bin: { example: 'bin/missing.mjs' }, dsh: { bundle: { patch: 'cordis.patch.yml' }, client: { platform: '', inject: 'wrong', immediately: 'yes' } } })
  const codes = audit(f.root).findings.map(f => f.code)
  for (const code of ['file.invalid', 'client.platform', 'client.inject', 'client.immediately']) assert.ok(codes.includes(code))
})
