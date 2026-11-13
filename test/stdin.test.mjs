import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { fixture } from './helpers.mjs'
import { readBounded } from '../src/stdin.mjs'

test('CLI accepts piped pack reports and returns structured errors for malformed JSON', t => {
  const f = fixture(t)
  const cli = fileURLToPath(new URL('../bin/audit.mjs', import.meta.url))
  const input = JSON.stringify([{ name: f.manifest.name, version: f.manifest.version, files: [{ path: 'package.json' }, { path: 'cordis.patch.yml' }] }])
  const run = value => spawnSync(process.execPath, [cli, f.root, '--packlist', '-', '--json'], { encoding: 'utf8', input: value })
  assert.equal(run(input).status, 0)
  const invalid = run('{')
  assert.equal(invalid.status, 1)
  assert.equal(JSON.parse(invalid.stdout).findings[0].code, 'pack.report')
})
test('bounded input reading refuses oversized data before consuming the whole stream', t => {
  const f = fixture(t)
  f.write('input.txt', 'x'.repeat(1000))
  const fd = fs.openSync(path.join(f.root, 'input.txt'), 'r')
  try {
    assert.throws(() => readBounded(fd, 32), /input limit/)
    const rest = Buffer.alloc(1000)
    assert.equal(fs.readSync(fd, rest, 0, rest.length, null), 967)
  } finally { fs.closeSync(fd) }
})
