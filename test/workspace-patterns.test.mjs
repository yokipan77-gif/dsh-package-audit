import test from 'node:test'
import assert from 'node:assert/strict'
import { auditWorkspace } from '../src/workspaces.mjs'
import { fixture } from './helpers.mjs'

test('workspace patterns allow literal double dots within directory names', t => {
  const { root, manifest, write } = fixture(t, { workspaces: ['plugins/feature..v2', '!plugins/skip..old'] })
  write('plugins/feature..v2/package.json', JSON.stringify(manifest))
  write('plugins/feature..v2/cordis.patch.yml', '[]')
  const report = auditWorkspace(root)
  assert.equal(report.ok, true, JSON.stringify(report.findings))
  assert.equal(report.packages.length, 1)
})

test('workspace patterns still reject parent segments with either path separator', t => {
  const { root, manifest, write } = fixture(t)
  for (const pattern of ['plugins/../outside', 'plugins\\..\\outside', '!../outside']) {
    manifest.workspaces = ['plugins/*', pattern]
    write('package.json', JSON.stringify(manifest))
    const report = auditWorkspace(root)
    assert.equal(report.ok, false)
    assert.match(report.findings[0].message, /parent paths/u)
  }
})
