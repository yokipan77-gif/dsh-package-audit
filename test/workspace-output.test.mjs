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

const cli = fileURLToPath(new URL('../bin/audit.mjs', import.meta.url))

for (const manager of ['npm', 'pnpm']) {
  test(`${manager} workspace reports protect ordinary library manifests and allow separate output`, t => {
    const { root, manifest, write } = fixture(t, { workspaces: ['packages/*'] })
    if (manager === 'pnpm') {
      write('package.json', '{"name":"workspace","private":true}')
      write('pnpm-workspace.yaml', "packages:\n  - 'packages/*'\n")
    }
    write('packages/plugin/package.json', JSON.stringify(manifest))
    write('packages/plugin/cordis.patch.yml', '[]')
    const original = '{"name":"ordinary-library","version":"1.0.0"}'
    write('packages/library/package.json', original)
    const filename = path.join(root, 'packages/library/package.json')
    const run = output => spawnSync(process.execPath, [cli, root, '--workspace', '--json', '--output', output], { encoding: 'utf8' })

    const blocked = run(filename)
    assert.equal(fs.readFileSync(filename, 'utf8'), original, 'must preserve the inspected manifest byte for byte')
    assert.equal(blocked.status, 2, blocked.stderr)
    assert.match(blocked.stderr, /overwrite an audited input/)

    const report = auditWorkspace(root)
    assert.equal(report.ok, true)
    assert.equal(report.packages.length, 1, 'ordinary libraries remain excluded from DSH validation')
    const validate = new Ajv().compile(schema)
    assert.equal(validate(report), true, JSON.stringify(validate.errors))

    const output = path.join(root, 'report.json')
    const written = run(output)
    assert.equal(written.status, 0, written.stderr)
    assert.deepEqual(JSON.parse(fs.readFileSync(output, 'utf8')), report)
    assert.equal(fs.readFileSync(filename, 'utf8'), original)
  })
}
