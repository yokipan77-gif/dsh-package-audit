import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { auditWorkspace } from '../src/workspaces.mjs'
import { fixture } from './helpers.mjs'

test('directory aliases of a member are audited only once', t => {
  const { root, manifest, write } = fixture(t, { workspaces: ['packages/*'] })
  write('packages/real/package.json', JSON.stringify(manifest))
  write('packages/real/cordis.patch.yml', '[]')
  fs.symlinkSync(path.join(root, 'packages/real'), path.join(root, 'packages/alias'), process.platform === 'win32' ? 'junction' : 'dir')
  const report = auditWorkspace(root)
  assert.equal(report.ok, true)
  assert.equal(report.packages.length, 1)
  assert.equal(report.packages[0].root, path.join(root, 'packages/real'))
})

test('shared manifest file links preserve each member package root', t => {
  const { root, manifest, write } = fixture(t, { workspaces: ['packages/*'] })
  write('shared/manifest.json', JSON.stringify(manifest))
  for (const name of ['one', 'two']) {
    write(`packages/${name}/cordis.patch.yml`, '[]')
    try {
      fs.symlinkSync(path.join(root, 'shared/manifest.json'), path.join(root, `packages/${name}/package.json`), 'file')
    } catch (error) {
      if (error.code === 'EPERM' && process.platform === 'win32') return t.skip('File symlink creation requires Windows developer mode or privilege')
      throw error
    }
  }
  const report = auditWorkspace(root)
  assert.equal(report.packages.length, 2)
  // Each member must reject its package.json link escaping that member, rather
  // than accidentally auditing the directory containing the shared target.
  assert.deepEqual(report.packages.map(pkg => pkg.root), ['one', 'two'].map(name => path.join(root, 'packages', name)))
  assert.ok(report.packages.every(pkg => pkg.findings.some(f => f.code === 'manifest.read')))
})
