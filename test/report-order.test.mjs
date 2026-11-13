import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { audit } from '../src/audit.mjs'
import { auditWorkspace } from '../src/workspaces.mjs'
import { fixture } from './helpers.mjs'

test('workspace package order uses stable code-point ordering rather than host locale', t => {
  const f = fixture(t, { workspaces: ['packages/*'] })
  for (const directory of ['zeta', '_tool', 'Alpha']) {
    f.write(`packages/${directory}/package.json`, JSON.stringify(f.manifest))
    f.write(`packages/${directory}/cordis.patch.yml`, '[]')
  }
  assert.deepEqual(auditWorkspace(f.root).packages.map(pkg => path.basename(pkg.root)), ['Alpha', '_tool', 'zeta'])
})

test('wildcard artifact references have deterministic portable ordering', t => {
  const f = fixture(t, { exports: { './*': './dist/*.mjs' } })
  for (const name of ['zeta', '_tool', 'Alpha']) f.write(`dist/${name}.mjs`, '')
  const references = audit(f.root).references.filter(ref => ref.field.startsWith('exports'))
  assert.deepEqual(references.map(ref => ref.file), ['dist/Alpha.mjs', 'dist/_tool.mjs', 'dist/zeta.mjs'])
})
