import test from 'node:test'
import assert from 'node:assert/strict'
import { audit } from '@yokipan77/dsh-package-audit'
import { auditWorkspace } from '@yokipan77/dsh-package-audit/workspace'
import { toSarif, toMarkdown, toText, allFindings } from '@yokipan77/dsh-package-audit/reports'
import { fixture } from './helpers.mjs'

test('public library entry points audit and format reports without CLI execution', t => {
  const f = fixture(t, { workspaces: ['packages/*'] })
  f.write('packages/plugin/package.json', JSON.stringify(f.manifest))
  f.write('packages/plugin/cordis.patch.yml', '[]')
  assert.equal(audit(f.root).ok, true)
  const report = auditWorkspace(f.root)
  assert.equal(report.ok, true)
  assert.deepEqual(allFindings(report), [])
  assert.equal(toSarif(report).version, '2.1.0')
  assert.ok(toMarkdown(report).includes('No findings.'))
  assert.ok(toText(report).includes('PASS example-plugin'))
})
