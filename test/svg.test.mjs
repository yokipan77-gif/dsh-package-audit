import test from 'node:test'
import assert from 'node:assert/strict'
import { audit } from '../src/audit.mjs'
import { ICON_MAX_BYTES } from '../src/icons.mjs'
import { fixture } from './helpers.mjs'

test('rejects non-SVG and malformed XML despite a valid .svg extension', t => {
  const { root, write } = fixture(t, { icon: 'icon.svg' })
  for (const text of ['<html>404</html>', '<svg><path></svg>', '<svg/><svg/>', '<svg xmlns="https://wrong.example"/>']) {
    write('icon.svg', text)
    assert.ok(audit(root).findings.some(f => f.code === 'icon.svg'), text)
  }
})

test('accepts SVG declarations, comments, namespaces and inert script text', t => {
  const { root, write } = fixture(t, { icon: 'icon.svg' })
  for (const text of ['<?xml version="1.0"?><!-- artwork --><svg xmlns="http://www.w3.org/2000/svg"><title>A &amp; B</title></svg>', '<s:svg xmlns:s="http://www.w3.org/2000/svg"/>', '<svg><script>throw new Error("never execute")</script></svg>']) {
    write('icon.svg', text)
    assert.equal(audit(root).ok, true, text)
  }
})

test('DTD entities remain explicitly unresolved and oversized SVG is not parsed', t => {
  const { root, write } = fixture(t, { icon: 'icon.svg' })
  write('icon.svg', '<!DOCTYPE svg [<!ENTITY label SYSTEM "https://example.invalid/entity">]><svg>&label;</svg>')
  const report = audit(root)
  assert.equal(report.ok, true)
  assert.equal(report.findings[0].code, 'icon.svg.dtd')
  assert.equal(report.findings[0].severity, 'warning')
  write('icon.svg', '<svg>'.padEnd(ICON_MAX_BYTES + 1, ' '))
  assert.deepEqual(audit(root).findings.map(f => f.code), ['icon.size'])
})
