import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { toMarkdown } from '../src/markdown.mjs'
import { parseArgs } from '../src/arguments.mjs'

test('summarizes workspace diagnostics using relative paths and escaped table text', () => {
  const root = path.resolve('project')
  const report = { root, ok: false, findings: [], packages: [{ root: path.join(root, 'packages', 'plugin'), findings: [{ code: 'example', severity: 'error', file: 'patch.yml', message: 'one | two\n<img src="x">' }] }] }
  const text = toMarkdown(report)
  assert.ok(text.includes('1 error(s), 0 warning(s)'))
  assert.ok(text.includes('packages/plugin/patch.yml'))
  assert.ok(text.includes('one \\| two &lt;img'))
  assert.equal(text.includes(root), false)
  assert.equal(text.includes('<img'), false)
})
test('clean reports are concise and output formats remain mutually exclusive', () => {
  assert.ok(toMarkdown({ root: '.', ok: true, findings: [] }).endsWith('No findings.'))
  assert.throws(() => parseArgs(['--markdown', '--json']))
  assert.equal(parseArgs(['--markdown']).markdown, true)
})
