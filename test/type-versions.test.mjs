import test from 'node:test'
import assert from 'node:assert/strict'
import { audit } from '../src/audit.mjs'
import { fixture } from './helpers.mjs'

test('checks explicit and wildcard typesVersions artifacts across compiler ranges', t => {
  const { root, write } = fixture(t, { typesVersions: { '<4.0': { 'index.d.ts': ['legacy/index.d.ts'] }, '>=4.0': { '*': ['types/*'] } } })
  assert.equal(audit(root).ok, false)
  write('legacy/index.d.ts', 'export {}')
  write('types/sub/index.d.mts', 'export {}')
  const report = audit(root)
  assert.equal(report.ok, true, JSON.stringify(report.findings))
  assert.ok(report.references.some(ref => ref.file === 'types/sub/index.d.mts'))
})

test('typesVersions declarations participate in npm artifact coverage', t => {
  const { root, manifest, write } = fixture(t, { typesVersions: { '*': { 'index.d.ts': ['types/index.d.ts'] } } })
  write('types/index.d.ts', '')
  const packlistContent = JSON.stringify([{ name: manifest.name, version: manifest.version, files: [{ path: 'package.json' }, { path: 'cordis.patch.yml' }] }])
  assert.ok(audit(root, { packlistContent }).findings.some(f => f.code === 'pack.missing' && f.file === 'types/index.d.ts'))
})

test('rejects malformed typesVersions ranges, maps and escaping targets', t => {
  for (const typesVersions of [[], { broken: {} }, { '*': [] }, { '*': { '*': [] } }, { '*': { '*': ['../outside.d.ts'] } }, { '*': { '**': ['types/*'] } }]) {
    const { root } = fixture(t, { typesVersions })
    assert.equal(audit(root).ok, false, JSON.stringify(typesVersions))
  }
})

test('discloses alternative and extension-substitution targets without false failures', t => {
  const { root } = fixture(t, { typesVersions: { '*': { 'index.d.ts': ['optional.d.ts', 'fallback.d.ts'], feature: ['types/feature'] } } })
  const report = audit(root)
  assert.equal(report.ok, true)
  assert.deepEqual(report.findings.map(f => f.code), ['types.fallback', 'types.resolution'])
})
