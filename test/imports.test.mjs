import test from 'node:test'
import assert from 'node:assert/strict'
import { audit } from '../src/audit.mjs'
import { fixture } from './helpers.mjs'

test('checks local conditional and wildcard imports without loading their modules', t => {
  const { root, write } = fixture(t, { imports: { '#entry': { import: './dist/entry.mjs' }, '#locale/*': './locale/*.json', '#blocked': null } })
  assert.equal(audit(root).ok, false)
  write('dist/entry.mjs', 'throw new Error("never execute")')
  write('locale/zh.json', '{}')
  const report = audit(root)
  assert.equal(report.ok, true, JSON.stringify(report.findings))
  assert.ok(report.references.some(ref => ref.field === 'imports.#entry.import'))
  assert.ok(report.references.some(ref => ref.file === 'locale/zh.json'))
})

test('records external imports and fallbacks as explicitly unresolved notes', t => {
  const { root } = fixture(t, { imports: { '#external': 'some-dependency/feature', '#fallback': ['./missing.mjs', './other.mjs'] } })
  const report = audit(root)
  assert.equal(report.ok, true)
  assert.deepEqual(report.findings.map(f => f.code), ['imports.external', 'imports.fallback'])
})

test('rejects malformed imports maps, keys, escapes and nested subpath maps', t => {
  for (const imports of [[], { '#': './index.mjs' }, { '#/bad': './index.mjs' }, { entry: './index.mjs' }, { '#escape': '../outside.mjs' }, { '#url': 'https://example.com/a.mjs' }, { '#nested': { './bad': './index.mjs' } }]) {
    const { root, write } = fixture(t, { imports })
    write('index.mjs', '')
    assert.equal(audit(root).ok, false, JSON.stringify(imports))
  }
})

test('local imports participate in required packed artifacts', t => {
  const { root, manifest, write } = fixture(t, { imports: { '#entry': './entry.mjs' } })
  write('entry.mjs', '')
  const packlistContent = JSON.stringify([{ name: manifest.name, version: manifest.version, files: [{ path: 'package.json' }, { path: 'cordis.patch.yml' }] }])
  assert.ok(audit(root, { packlistContent }).findings.some(f => f.code === 'pack.missing' && f.file === 'entry.mjs'))
})
