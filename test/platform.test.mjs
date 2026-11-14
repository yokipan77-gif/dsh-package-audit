import test from 'node:test'
import assert from 'node:assert/strict'
import { audit } from '../src/audit.mjs'
import { parseArgs } from '../src/arguments.mjs'
import { fixture } from './helpers.mjs'

test('evaluates npm OS and CPU allow/deny lists against explicit targets', t => {
  const { root } = fixture(t, { os: ['linux', '!win32'], cpu: ['arm64', '!x64'] })
  assert.equal(audit(root).ok, true)
  assert.equal(audit(root, { platform: 'linux' }).ok, true)
  assert.equal(audit(root, { arch: 'arm64' }).ok, true)
  const result = audit(root, { platform: 'win32', arch: 'x64' })
  assert.deepEqual(result.findings.map(f => f.code), ['compat.os', 'compat.cpu'])
  assert.deepEqual(parseArgs(['--arch', 'arm64']).arch, 'arm64')
})

test('supports npm any, exclusion-only and string declarations', t => {
  const { root, write, manifest } = fixture(t, { os: '!win32', cpu: ['any'] })
  assert.equal(audit(root, { platform: 'linux', arch: 'riscv64' }).ok, true)
  assert.equal(audit(root, { platform: 'win32' }).ok, false)
  manifest.os = ['linux', '!linux']
  write('package.json', JSON.stringify(manifest))
  assert.equal(audit(root, { platform: 'linux' }).ok, false)
})

test('reports malformed platform declarations without guessing host compatibility', t => {
  const { root } = fixture(t, { os: ['!'], cpu: [42], engines: 'invalid' })
  const result = audit(root)
  assert.ok(result.findings.some(f => f.code === 'compat.os.declaration'))
  assert.ok(result.findings.some(f => f.code === 'compat.cpu.declaration'))
  assert.equal(result.findings.some(f => ['compat.os', 'compat.cpu'].includes(f.code)), false)
})

test('evaluates libc explicitly for Linux without using the auditors host libc', t => {
  const { root } = fixture(t, { os: ['linux'], libc: ['glibc', '!musl'] })
  assert.equal(audit(root).ok, true)
  assert.equal(audit(root, { platform: 'linux' }).ok, true)
  assert.equal(audit(root, { platform: 'linux', libc: 'glibc' }).ok, true)
  assert.ok(audit(root, { platform: 'linux', libc: 'musl' }).findings.some(f => f.code === 'compat.libc'))
  assert.ok(audit(root, { libc: 'glibc' }).findings.some(f => f.code === 'compat.libc.target'))
  assert.throws(() => parseArgs(['--libc', 'musl']), /requires --platform linux/u)
  assert.throws(() => parseArgs(['--platform', 'win32', '--libc', 'musl']), /requires --platform linux/u)
  assert.equal(parseArgs(['--platform', 'linux', '--libc', 'musl']).libc, 'musl')
})

test('reports malformed libc declarations even without a target', t => {
  const { root } = fixture(t, { libc: [null] })
  assert.ok(audit(root).findings.some(f => f.code === 'compat.libc.declaration'))
})
