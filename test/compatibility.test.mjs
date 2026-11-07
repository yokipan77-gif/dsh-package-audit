import test from 'node:test'
import assert from 'node:assert/strict'
import { audit } from '../src/audit.mjs'
import { fixture } from './helpers.mjs'

test('engines.dsh takes precedence over DSH peers, including prereleases', t => {
  const f = fixture(t, { engines: { dsh: '>=0.2.1 <0.3' }, peerDependencies: { '@deepseek-ai/dsh': '<0.1' } })
  assert.equal(audit(f.root, { dshVersion: '0.2.2-rc.1' }).ok, true)
  assert.ok(audit(f.root, { dshVersion: '0.3.0' }).findings.some(f => f.code === 'compat.dsh'))
})
test('falls back to DSH peers and accepts only their supported workspace shortcuts', t => {
  const f = fixture(t, { peerDependencies: { '@deepseek-ai/dsh-client': 'workspace:^', react: '^18' } })
  assert.equal(audit(f.root, { dshVersion: '0.2.2-rc.1' }).ok, true)
  f.manifest.engines = { dsh: 'workspace:^' }
  f.write('package.json', JSON.stringify(f.manifest))
  assert.ok(audit(f.root).findings.some(f => f.code === 'compat.range'))
})
test('does not invent a host version and rejects malformed requirements', t => {
  const f = fixture(t, { engines: { dsh: '>=999.0.0' } })
  assert.equal(audit(f.root).ok, true)
  f.manifest.engines = { dsh: 7 }
  f.write('package.json', JSON.stringify(f.manifest))
  assert.equal(audit(f.root).ok, false)
})
test('checks target platform only when requested', t => {
  const f = fixture(t, { dsh: { bundle: { patch: 'cordis.patch.yml', platforms: ['linux'] } } })
  assert.equal(audit(f.root).ok, true)
  assert.equal(audit(f.root, { platform: 'win32' }).ok, false)
})
