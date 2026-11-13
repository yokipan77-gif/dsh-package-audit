import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { audit } from '../src/audit.mjs'
import { auditWorkspace } from '../src/workspaces.mjs'
import { toSarif } from '../src/sarif.mjs'
import { fixture } from './helpers.mjs'

test('directory aliases yield the same single-package report as the real directory', t => {
  const f = fixture(t)
  const holder = fixture(t)
  const alias = path.join(holder.root, 'alias')
  fs.symlinkSync(f.root, alias, process.platform === 'win32' ? 'junction' : 'dir')
  assert.deepEqual(audit(alias), audit(f.root))
})

test('workspace alias reports keep SARIF locations inside the repository', t => {
  const f = fixture(t, { workspaces: ['packages/*'] })
  f.write('packages/broken/package.json', '{')
  const holder = fixture(t)
  const alias = path.join(holder.root, 'alias')
  fs.symlinkSync(f.root, alias, process.platform === 'win32' ? 'junction' : 'dir')
  const report = auditWorkspace(alias)
  assert.deepEqual(report, auditWorkspace(f.root))
  const uri = toSarif(report).runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri
  assert.equal(uri, 'packages/broken/package.json')
})
