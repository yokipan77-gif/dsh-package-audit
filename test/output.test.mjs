import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { fixture } from './helpers.mjs'

const cli = fileURLToPath(new URL('../bin/audit.mjs', import.meta.url))
test('writes UTF-8 reports even when the audit fails and preserves exit codes', t => {
  const f = fixture(t, { name: '@scope/插件' })
  const output = path.join(f.root, '报告.json')
  const run = spawnSync(process.execPath, [cli, f.root, '--json', '--output', output], { encoding: 'utf8' })
  assert.equal(run.status, 1)
  assert.equal(run.stdout, '')
  assert.equal(JSON.parse(fs.readFileSync(output, 'utf8')).name, f.manifest.name)
  assert.equal(fs.readdirSync(f.root).some(name => name.endsWith('.tmp')), false)
})
test('refuses to overwrite manifest and patch inputs', t => {
  const f = fixture(t)
  for (const file of ['package.json', 'cordis.patch.yml']) {
    const target = path.join(f.root, file)
    const before = fs.readFileSync(target, 'utf8')
    const run = spawnSync(process.execPath, [cli, f.root, '--output', target], { encoding: 'utf8' })
    assert.equal(run.status, 2)
    assert.equal(fs.readFileSync(target, 'utf8'), before)
  }
})
