import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
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

test('flags stale artifact sizes without claiming to authenticate a supplied report', t => {
  const f = fixture(t)
  const report = { name: f.manifest.name, version: f.manifest.version, files: [{ path: 'package.json' }, { path: 'cordis.patch.yml', size: fs.statSync(path.join(f.root, 'cordis.patch.yml')).size }] }
  const options = { packlist: path.join(f.root, 'pack.json') }
  f.write('pack.json', JSON.stringify([report]))
  assert.equal(audit(f.root, options).findings.length, 0)
  f.write('cordis.patch.yml', '[]')
  const result = audit(f.root, options)
  assert.equal(result.ok, true)
  assert.equal(result.findings[0].code, 'pack.stale')
})

test('rejects duplicate paths and malformed sizes in pack reports', t => {
  const f = fixture(t)
  for (const files of [[{ path: 'package.json' }, { path: './package.json' }], [{ path: 'package.json', size: -1 }]]) {
    f.write('pack.json', JSON.stringify([{ name: f.manifest.name, version: f.manifest.version, files }]))
    assert.equal(audit(f.root, { packlist: path.join(f.root, 'pack.json') }).findings[0].code, 'pack.report')
  }
})

test('normalizes portable pack paths before matching artifacts and duplicates', t => {
  const f = fixture(t)
  const writeReport = files => f.write('pack.json', JSON.stringify([{ name: f.manifest.name, version: f.manifest.version, files: files.map(path => ({ path })) }]))
  const options = { packlist: path.join(f.root, 'pack.json') }
  writeReport(['././package.json', './cordis.patch.yml'])
  assert.equal(audit(f.root, options).ok, true)
  writeReport(['package.json', '././package.json', 'cordis.patch.yml'])
  assert.ok(audit(f.root, options).findings.some(f => f.code === 'pack.report' && f.message.includes('repeats')))
})

test('rejects empty and directory-shaped file entries', t => {
  const f = fixture(t)
  for (const entry of ['', '.', './', 'directory/']) {
    f.write('pack.json', JSON.stringify([{ name: f.manifest.name, version: f.manifest.version, files: [{ path: entry }] }]))
    assert.ok(audit(f.root, { packlist: path.join(f.root, 'pack.json') }).findings.some(f => f.code === 'pack.report'))
  }
})
