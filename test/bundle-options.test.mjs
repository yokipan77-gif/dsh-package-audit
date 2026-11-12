import test from 'node:test'
import assert from 'node:assert/strict'
import { audit } from '../src/audit.mjs'
import { fixture } from './helpers.mjs'

test('accepts a hidden bundle and rejects a string-valued listedByDefault', t => {
  const f = fixture(t)
  f.manifest.dsh.bundle.listedByDefault = false
  f.write('package.json', JSON.stringify(f.manifest))
  assert.equal(audit(f.root).ok, true)
  f.manifest.dsh.bundle.listedByDefault = 'false'
  f.write('package.json', JSON.stringify(f.manifest))
  assert.ok(audit(f.root).findings.some(f => f.code === 'bundle.listed'))
})
test('warns on repeated patch artifacts after path normalization', t => {
  const f = fixture(t)
  f.manifest.dsh.bundle.patch = ['cordis.patch.yml', './cordis.patch.yml']
  f.write('package.json', JSON.stringify(f.manifest))
  const report = audit(f.root)
  assert.equal(report.ok, true)
  assert.equal(report.findings[0].code, 'patch.duplicate')
})
