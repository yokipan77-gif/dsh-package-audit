import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import { audit } from '../src/audit.mjs'
import { parseArgs } from '../src/arguments.mjs'
import { fixture } from './helpers.mjs'

test('enforces an unpacked-size budget with an inclusive boundary', t => {
  const f = fixture(t)
  const files = ['package.json', 'cordis.patch.yml'].map(file => ({ path: file, size: fs.statSync(path.join(f.root, file)).size }))
  const total = files.reduce((sum, file) => sum + file.size, 0)
  f.write('pack.json', JSON.stringify([{ name: f.manifest.name, version: f.manifest.version, files }]))
  const options = { packlist: path.join(f.root, 'pack.json'), maxUnpackedSize: total }
  assert.equal(audit(f.root, options).ok, true)
  assert.ok(audit(f.root, { ...options, maxUnpackedSize: total - 1 }).findings.some(f => f.code === 'pack.budget'))
})
test('rejects unevaluable budgets and invalid CLI byte counts', t => {
  const f = fixture(t)
  assert.equal(audit(f.root, { maxUnpackedSize: 100 }).ok, false)
  for (const value of ['1.5', '1e3', 'NaN', '9007199254740992']) assert.throws(() => parseArgs(['--packlist', 'pack.json', '--max-unpacked-size', value]))
  assert.throws(() => parseArgs(['--max-unpacked-size', '100']))
  assert.equal(parseArgs(['--packlist', 'pack.json', '--max-unpacked-size', '0']).maxUnpackedSize, 0)
})
