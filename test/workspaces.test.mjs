import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { auditWorkspace } from '../src/workspaces.mjs'
import { fixture } from './helpers.mjs'

test('audits each DSH member once and skips ordinary workspace libraries', t => {
  const f = fixture(t, { workspaces: ['packages/*', 'packages/good'] })
  f.write('packages/good/package.json', JSON.stringify(f.manifest))
  f.write('packages/good/cordis.patch.yml', '[]')
  f.write('packages/library/package.json', '{"name":"helper"}')
  f.write('packages/broken/package.json', JSON.stringify({ name: 'broken', version: '1.0.0', dsh: { client: { platform: 'web' } } }))
  const report = auditWorkspace(f.root)
  assert.equal(report.packages.length, 2)
  assert.equal(report.ok, false)
  assert.equal(report.packages.find(p => p.name === 'example-plugin').ok, true)
})
test('reports malformed members rather than dropping them from the result', t => {
  const f = fixture(t, { workspaces: { packages: ['packages/*'] } })
  f.write('packages/broken/package.json', '{')
  assert.equal(auditWorkspace(f.root).packages[0].findings[0].code, 'manifest.read')
})

test('non-object member manifests fail workspace reports and the CLI', t => {
  const f = fixture(t, { workspaces: ['packages/*'] })
  f.write('packages/good/package.json', JSON.stringify(f.manifest))
  f.write('packages/good/cordis.patch.yml', '[]')
  f.write('packages/library/package.json', '{"name":"helper"}')
  const invalid = [null, [], 'plugin', 42, true]
  for (const [i, value] of invalid.entries()) {
    f.write(`packages/invalid-${i}/package.json`, JSON.stringify(value))
  }
  const report = auditWorkspace(f.root)
  assert.equal(report.ok, false)
  assert.equal(report.packages.length, invalid.length + 1)
  const rejected = report.packages.filter(pkg => !pkg.ok)
  assert.equal(rejected.length, invalid.length)
  for (const pkg of rejected) assert.equal(pkg.findings[0].code, 'manifest.object')

  const cli = fileURLToPath(new URL('../bin/audit.mjs', import.meta.url))
  const result = spawnSync(process.execPath, [cli, f.root, '--workspace', '--json'], { encoding: 'utf8' })
  assert.equal(result.status, 1, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), report)
})
test('fails empty workspace discovery and rejects parent-directory patterns', t => {
  const f = fixture(t, { workspaces: ['packages/*'] })
  assert.equal(auditWorkspace(f.root).ok, false)
  f.manifest.workspaces = ['../*']
  f.write('package.json', JSON.stringify(f.manifest))
  assert.match(auditWorkspace(f.root).findings[0].message, /parent paths/)
})

test('honors workspace exclusions regardless of declaration order', t => {
  const f = fixture(t, { workspaces: ['!packages/private', 'packages/*', '!**/fixtures/**'] })
  f.write('packages/public/package.json', JSON.stringify(f.manifest))
  f.write('packages/public/cordis.patch.yml', '[]')
  f.write('packages/private/package.json', '{')
  const result = auditWorkspace(f.root)
  assert.equal(result.ok, true)
  assert.equal(result.packages.length, 1)
  assert.ok(result.packages[0].root.endsWith('public'))
})

test('rejects exclusion-only and escaping exclusion configurations', t => {
  const f = fixture(t, { workspaces: ['!packages/private'] })
  assert.equal(auditWorkspace(f.root).ok, false)
  f.manifest.workspaces = ['packages/*', '!../private']
  f.write('package.json', JSON.stringify(f.manifest))
  assert.equal(auditWorkspace(f.root).ok, false)
})
