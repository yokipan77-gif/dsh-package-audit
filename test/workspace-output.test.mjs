import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import Ajv from 'ajv'
import schema from '../schemas/report-v1.schema.json' with { type: 'json' }
import { auditWorkspace } from '../src/workspaces.mjs'
import { fixture } from './helpers.mjs'

test('workspace reports cannot overwrite inspected non-DSH member manifests', t => {
  const { root, manifest, write } = fixture(t, { workspaces: ['packages/*'] })
  write('packages/plugin/package.json', JSON.stringify(manifest))
  write('packages/plugin/cordis.patch.yml', '[]')
  const original = '{"name":"ordinary-library","version":"1.0.0"}'
  write('packages/library/package.json', original)
  const filename = path.join(root, 'packages/library/package.json')
  const cli = fileURLToPath(new URL('../bin/audit.mjs', import.meta.url))
  const result = spawnSync(process.execPath, [cli, root, '--workspace', '--json', '--output', filename], { encoding: 'utf8' })
  assert.equal(result.status, 2, result.stderr)
  assert.equal(fs.readFileSync(filename, 'utf8'), original)
  const report = auditWorkspace(root)
  const validate = new Ajv().compile(schema)
  assert.equal(validate(report), true, JSON.stringify(validate.errors))
})
