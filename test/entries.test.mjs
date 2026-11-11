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
test('respects blocked exports and discloses unresolved fallback arrays', t => {
  const f = fixture(t, { exports: { './hidden': null, './locale/*': './locale/*.json', '.': ['./optional.js', './fallback.js'] } })
  f.write('locale/en.json', '{}')
  const report = audit(f.root)
  assert.equal(report.ok, true)
  assert.deepEqual(report.findings.map(f => f.code), ['entry.fallback'])
})

test('enumerates nested wildcard exports and records each packed-file reference', t => {
  const f = fixture(t, { exports: { './locale/*': './locale/*.json' } })
  f.write('locale/en.json', '{}')
  f.write('locale/zh/CN.json', '{}')
  const report = audit(f.root)
  assert.equal(report.ok, true)
  assert.ok(report.references.some(ref => ref.file === 'locale/zh/CN.json'))
})

test('fails unmatched and escaping wildcard exports', t => {
  for (const target of ['./dist/*.js', './../outside/*.js']) {
    const f = fixture(t, { exports: { './*': target } })
    assert.equal(audit(f.root).ok, false)
  }
})
test('validates declared CLI binaries and client fields', t => {
  const f = fixture(t, { bin: { example: 'bin/missing.mjs' }, dsh: { bundle: { patch: 'cordis.patch.yml' }, client: { platform: '', inject: 'wrong', immediately: 'yes' } } })
  const codes = audit(f.root).findings.map(f => f.code)
  for (const code of ['file.invalid', 'client.platform', 'client.inject', 'client.immediately']) assert.ok(codes.includes(code))
})
