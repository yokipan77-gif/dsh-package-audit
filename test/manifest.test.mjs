import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { audit } from '../src/audit.mjs'
import { fixture } from './helpers.mjs'

test('accepts single and ordered bundle patches', t => {
  const f = fixture(t)
  assert.equal(audit(f.root).ok, true)
  f.manifest.dsh.bundle.patch = ['cordis.patch.yml', 'second.yml']
  f.write('second.yml', '[]')
  f.write('package.json', JSON.stringify(f.manifest))
  assert.equal(audit(f.root).ok, true)
})
test('reports client-only declarations and invalid JSON without crashing', t => {
  const f = fixture(t, { dsh: { client: { platform: 'web' } } })
  assert.ok(audit(f.root).findings.some(f => f.code === 'bundle.required'))
  f.write('package.json', '{')
  assert.equal(audit(f.root).findings[0].code, 'manifest.read')
})
test('CLI returns machine-readable failures and a nonzero exit code', t => {
  const f = fixture(t, { version: '' })
  const run = spawnSync(process.execPath, [fileURLToPath(new URL('../bin/audit.mjs', import.meta.url)), f.root, '--json'], { encoding: 'utf8' })
  assert.equal(run.status, 1)
  assert.equal(JSON.parse(run.stdout).ok, false)
})
