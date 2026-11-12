import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { audit } from '../src/audit.mjs'
import { fixture } from './helpers.mjs'

test('finds broken local screenshot paths without requiring repo artwork in npm', t => {
  const f = fixture(t)
  f.write('screenshots.json', '["docs/screen.png"]')
  assert.equal(audit(f.root).ok, false)
  f.write('docs/screen.png', 'repository image')
  f.write('pack.json', JSON.stringify([{ name: f.manifest.name, version: f.manifest.version, files: [{ path: 'package.json' }, { path: 'cordis.patch.yml' }] }]))
  assert.equal(audit(f.root, { packlist: path.join(f.root, 'pack.json') }).ok, true)
})
test('rejects escaping screenshot paths, invalid counts and unsupported remote hosts', t => {
  for (const shots of [[], ['../screen.png'], ['https://other.example/screen.png']]) {
    const f = fixture(t)
    f.write('screenshots.json', JSON.stringify(shots))
    assert.equal(audit(f.root).ok, false)
  }
})
test('accepts GitHub URLs while explicitly recording that they were not fetched', t => {
  const f = fixture(t)
  f.write('screenshots.json', '{"screenshots":[{"src":"https://raw.githubusercontent.com/owner/repo/main/screen.png"}]}')
  const report = audit(f.root)
  assert.equal(report.ok, true)
  assert.equal(report.findings[0].code, 'screenshots.remote')
})
