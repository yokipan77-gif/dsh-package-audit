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
  const png = Buffer.alloc(ICON_MAX_BYTES)
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png)
  f.write('icon.png', png)
  assert.equal(audit(f.root).ok, true)
  f.write('icon.png', Buffer.alloc(ICON_MAX_BYTES + 1))
  assert.ok(audit(f.root).findings.some(f => f.code === 'icon.size'))
})

test('rejects raster icons whose contents do not match their extension', t => {
  for (const extension of ['png', 'jpg', 'jpeg', 'webp']) {
    const f = fixture(t, { icon: `icon.${extension}` })
    f.write(`icon.${extension}`, '<html>404 not found</html>')
    assert.ok(audit(f.root).findings.some(f => f.code === 'icon.signature'))
  }
})
test('recognizes JPEG and WebP headers without claiming full image decoding', t => {
  for (const [extension, header] of [['jpg', Buffer.from([255, 216, 255])], ['webp', Buffer.from('RIFF0000WEBP')]]) {
    const f = fixture(t, { icon: `icon.${extension}` })
    f.write(`icon.${extension}`, header)
    assert.equal(audit(f.root).ok, true)
  }
})
test('rejects empty and unsupported icon files with artifact locations', t => {
  const f = fixture(t, { icon: 'art/icon.gif' })
  f.write('art/icon.gif', '')
  const findings = audit(f.root).findings
  assert.deepEqual(findings.map(f => f.code), ['icon.extension', 'icon.empty'])
  assert.ok(findings.every(f => f.file === 'art/icon.gif'))
})
