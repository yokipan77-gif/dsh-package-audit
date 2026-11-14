import test from 'node:test'
import assert from 'node:assert/strict'
import { audit } from '../src/audit.mjs'
import { fixture } from './helpers.mjs'

test('deep export conditions produce a bounded diagnostic instead of overflowing', t => {
  const { root, write } = fixture(t)
  write('index.mjs', '')
  for (const kind of ['conditions', 'fallbacks']) {
    const target = kind === 'conditions'
      ? '{"default":'.repeat(5000) + '"./index.mjs"' + '}'.repeat(5000)
      : '['.repeat(5000) + '"./index.mjs"' + ']'.repeat(5000)
    write('package.json', '{"name":"example-plugin","version":"1.0.0","dsh":{"bundle":{"patch":"cordis.patch.yml"}},"exports":' + target + '}')
    const report = audit(root)
    assert.equal(report.ok, false)
    assert.equal(report.findings.filter(f => f.code === 'entry.depth').length, 1)
  }
})
