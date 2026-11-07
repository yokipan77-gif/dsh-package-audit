import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { packageFile } from '../src/files.mjs'
import { audit } from '../src/audit.mjs'
import { fixture } from './helpers.mjs'

test('accepts nested relative files and normalized separators', t => {
  const f = fixture(t)
  f.write('dist/patch.yml', '[]')
  assert.equal(packageFile(f.root, '.\\dist\\patch.yml').relative, 'dist/patch.yml')
})
test('rejects traversal, absolute paths, URLs, missing files and directories', t => {
  const f = fixture(t)
  for (const name of ['../outside', '/etc/passwd', 'C:\\outside', '\\\\server\\share', 'https://example.org/x', 'absent', '.']) {
    assert.throws(() => packageFile(f.root, name), undefined, name)
  }
})
test('detects escaping directory junctions before reading files', t => {
  const f = fixture(t)
  const outside = fixture(t)
  fs.symlinkSync(outside.root, path.join(f.root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir')
  assert.throws(() => packageFile(f.root, 'linked/package.json'), /symlink target/)
})
test('audit reports a missing bundle artifact without executing package scripts', t => {
  const f = fixture(t, { scripts: { prepare: 'throw-not-executed' }, dsh: { bundle: { patch: 'missing.yml' } } })
  assert.equal(audit(f.root).ok, false)
  assert.equal(audit(f.root).findings[0].code, 'file.invalid')
})
