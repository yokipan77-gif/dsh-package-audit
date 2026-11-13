import test from 'node:test'
import assert from 'node:assert/strict'
import Ajv from 'ajv'
import schema from '../schemas/report-v1.schema.json' with { type: 'json' }
import { audit } from '../src/audit.mjs'
import { auditWorkspace } from '../src/workspaces.mjs'
import { fixture } from './helpers.mjs'

const validate = new Ajv({ strict: true }).compile(schema)
test('published schema validates successful, invalid and workspace reports', t => {
  const { root, write } = fixture(t, { workspaces: ['.'] })
  for (const report of [audit(root), auditWorkspace(root)]) {
    assert.equal(validate(report), true, JSON.stringify(validate.errors))
  }
  write('package.json', JSON.stringify({ name: 42, version: 'broken' }))
  const invalid = audit(root)
  assert.equal(invalid.name, null)
  assert.equal(validate(invalid), true, JSON.stringify(validate.errors))
  write('package.json', '{')
  assert.equal(validate(audit(root)), true, JSON.stringify(validate.errors))
  assert.equal(validate(auditWorkspace(root)), true, JSON.stringify(validate.errors))
})

test('schema rejects unknown severities and unversioned report shapes', t => {
  const { root } = fixture(t)
  const report = audit(root)
  report.findings.push({ code: 'sample', severity: 'fatal', file: 'package.json', message: 'sample' })
  assert.equal(validate(report), false)
  delete report.schemaVersion
  assert.equal(validate(report), false)
})
