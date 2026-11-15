import test from 'node:test'
import assert from 'node:assert/strict'
import { audit } from '../src/audit.mjs'
import { fixture } from './helpers.mjs'

test('parses npm ranges, tags and aliases without requiring installed dependencies', t => {
  const { root } = fixture(t, {
    dependencies: { semver: '^7.0.0', alias: 'npm:yaml@^2.0.0' },
    devDependencies: { tool: 'latest' },
    optionalDependencies: { native: '~1.2.0' },
    peerDependencies: { '@scope/host': '>=1 <3' },
    peerDependenciesMeta: { '@scope/host': { optional: true } },
  })
  assert.equal(audit(root).ok, true)
})

test('reports malformed maps, names, specs and peer optional flags', t => {
  for (const overrides of [
    { dependencies: [] }, { devDependencies: false },
    { dependencies: { 'bad name': '^1' } },
    { optionalDependencies: { plugin: 42 } },
    { dependencies: { plugin: 'bad version with spaces' } },
    { dependencies: { plugin: 'workspace:' } },
    { peerDependenciesMeta: [] },
    { peerDependenciesMeta: { plugin: { optional: 'yes' } } },
  ]) {
    const { root } = fixture(t, overrides)
    assert.equal(audit(root).ok, false, JSON.stringify(overrides))
  }
})

test('records unresolved workspace, catalog, file and remote sources without fetching them', t => {
  const { root } = fixture(t, { dependencies: { local: 'workspace:*', catalogued: 'catalog:', linked: 'link:../missing', disk: 'file:../missing', remote: 'https://example.invalid/package.tgz' } })
  const report = audit(root)
  assert.equal(report.ok, true)
  assert.equal(report.findings.filter(f => f.code === 'dependency.workspace').length, 3)
  assert.equal(report.findings.filter(f => f.code === 'dependency.external').length, 2)
})

test('dependency diagnostics do not expose credential-bearing specifier values', t => {
  const { root } = fixture(t, { dependencies: { invalid: 'unsupported://user:secret@example.invalid/a', remote: 'https://user:secret@example.invalid/package.tgz' } })
  const report = audit(root)
  assert.equal(report.ok, false)
  assert.ok(report.findings.some(f => f.code === 'dependency.spec'))
  assert.equal(JSON.stringify(report.findings).includes('secret'), false)
  assert.equal(JSON.stringify(report.findings).includes('example.invalid'), false)
})
