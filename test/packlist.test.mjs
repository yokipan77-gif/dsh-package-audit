import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { audit } from '../src/audit.mjs'
import { parseArgs } from '../src/arguments.mjs'
import { fixture } from './helpers.mjs'

test('catches a source file omitted from the published package', t => {
  const f = fixture(t)
  const report = { name: f.manifest.name, version: f.manifest.version, files: [{ path: 'package.json' }] }
  const options = { packlist: path.join(f.root, 'pack.json') }
  f.write('pack.json', JSON.stringify([report]))
  assert.equal(audit(f.root).ok, true)
  assert.equal(audit(f.root, options).findings[0].code, 'pack.missing')
  report.files.push({ path: 'cordis.patch.yml' })
  f.write('pack.json', JSON.stringify([report]))
  assert.equal(audit(f.root, options).ok, true)
})
test('refuses reports for another package or version instead of claiming a pass', t => {
  const f = fixture(t)
  f.write('pack.json', JSON.stringify([{ name: 'other', version: '1.0.0', files: [] }]))
  assert.equal(audit(f.root, { packlist: path.join(f.root, 'pack.json') }).findings[0].code, 'pack.report')
})
test('CLI rejects incomplete and duplicated pack report options', () => {
  assert.throws(() => parseArgs(['--packlist', '--json']))
  assert.throws(() => parseArgs(['--json', '--json']))
  assert.deepEqual(parseArgs(['plugin', '--packlist', 'pack.json']).packlist, 'pack.json')
})
