import test from 'node:test'
import assert from 'node:assert/strict'
import { audit } from '../src/audit.mjs'
import { ICON_MAX_BYTES } from '../src/icons.mjs'
import { fixture } from './helpers.mjs'

test('icon is optional, but declared files must satisfy the host size limit', t => {
  const f = fixture(t)
  assert.equal(audit(f.root).ok, true)
  f.manifest.icon = './icon.png'
  f.write('package.json', JSON.stringify(f.manifest))
  f.write('icon.png', Buffer.alloc(ICON_MAX_BYTES))
  assert.equal(audit(f.root).ok, true)
  f.write('icon.png', Buffer.alloc(ICON_MAX_BYTES + 1))
  assert.ok(audit(f.root).findings.some(f => f.code === 'icon.size'))
})
test('rejects empty and unsupported icon files with artifact locations', t => {
  const f = fixture(t, { icon: 'art/icon.gif' })
  f.write('art/icon.gif', '')
  const findings = audit(f.root).findings
  assert.deepEqual(findings.map(f => f.code), ['icon.extension', 'icon.empty'])
  assert.ok(findings.every(f => f.file === 'art/icon.gif'))
})
