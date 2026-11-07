import test from 'node:test'
import assert from 'node:assert/strict'
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
test('fails empty workspace discovery and rejects parent-directory patterns', t => {
  const f = fixture(t, { workspaces: ['packages/*'] })
  assert.equal(auditWorkspace(f.root).ok, false)
  f.manifest.workspaces = ['../*']
  f.write('package.json', JSON.stringify(f.manifest))
  assert.match(auditWorkspace(f.root).findings[0].message, /parent paths/)
})
