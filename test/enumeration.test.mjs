import test from 'node:test'
import assert from 'node:assert/strict'
import { audit } from '../src/audit.mjs'
import { fixture } from './helpers.mjs'
import { packageFiles } from '../src/enumeration.mjs'

test('wildcard artifact checks skip directories and inspect nested regular files', t => {
  const { root, write } = fixture(t, { exports: { './*': './dist/*' } })
  write('dist/nested/index.mjs', '')
  const report = audit(root)
  assert.equal(report.ok, true, JSON.stringify(report.findings))
  assert.deepEqual(report.references.filter(ref => ref.field.startsWith('exports')).map(ref => ref.file), ['dist/nested/index.mjs'])
})

test('filesystem traversal enforces its bound and skips dependency trees', t => {
  const { root, write } = fixture(t)
  write('node_modules/ignored/deep/entry.mjs', '')
  write('.git/ignored/deep/entry.mjs', '')
  assert.deepEqual(packageFiles(root), ['cordis.patch.yml', 'package.json'])
  for (let index = 0; index < 20; index++) write(`many/${index}.mjs`, '')
  assert.throws(() => packageFiles(root, 5), /exceeded 5 filesystem entries/u)
})
