import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { audit } from '../src/audit.mjs'

const npmCli = process.env.npm_execpath
if (!npmCli || !fs.existsSync(npmCli)) throw new Error('Run this validation with npm run smoke so npm_execpath identifies the installed npm CLI.')
const project = fileURLToPath(new URL('../', import.meta.url))
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-release-smoke-'))
try {
  const sample = path.join(temporary, 'plugin')
  fs.cpSync(path.join(project, 'examples/minimal'), sample, { recursive: true })
  const manifestPath = path.join(sample, 'package.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  manifest.scripts = { prepare: 'node -e "require(\'node:fs\').writeFileSync(\'LIFECYCLE_RAN\',\'unexpected\')"' }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest))
  assert.equal(audit(sample).ok, true)
  assert.equal(fs.existsSync(path.join(sample, 'LIFECYCLE_RAN')), false)
  // npm 10 pack runs prepare even with --ignore-scripts. The audit itself
  // never invokes npm; pack only this controlled, script-free fixture.
  delete manifest.scripts
  fs.writeFileSync(manifestPath, JSON.stringify(manifest))
  const pack = cwd => {
    const result = spawnSync(process.execPath, [npmCli, 'pack', '--dry-run', '--json', '--ignore-scripts', '--offline'], {
      cwd, encoding: 'utf8', timeout: 30_000,
    })
    assert.equal(result.status, 0, result.stderr || result.error?.message)
    return JSON.parse(result.stdout)
  }
  const packlist = path.join(temporary, 'pack.json')
  fs.writeFileSync(packlist, JSON.stringify(pack(sample)))
  assert.equal(audit(sample, { packlist, dshVersion: '0.2.2-rc.1' }).ok, true)
  assert.equal(fs.existsSync(path.join(sample, 'LIFECYCLE_RAN')), false)

  // Reproduce an npm files whitelist that accidentally drops the bundle patch.
  manifest.files = ['index.mjs', 'assets']
  fs.writeFileSync(manifestPath, JSON.stringify(manifest))
  fs.writeFileSync(packlist, JSON.stringify(pack(sample)))
  assert.ok(audit(sample, { packlist }).findings.some(f => f.code === 'pack.missing' && f.file === 'cordis.patch.yml'))
  assert.equal(fs.existsSync(path.join(sample, 'LIFECYCLE_RAN')), false)

  const own = pack(project)[0]
  for (const file of ['bin/audit.mjs', 'src/audit.mjs', 'src/workspaces.mjs', 'src/sarif.mjs', 'LICENSE']) {
    assert.ok(own.files.some(entry => entry.path === file), `Auditor package omits ${file}`)
  }
  console.log('Release smoke passed: valid artifact, omitted patch, audit executes no scripts, auditor package contents.')
} finally {
  const resolved = path.resolve(temporary)
  assert.ok(path.dirname(resolved) === path.resolve(os.tmpdir()) && path.basename(resolved).startsWith('dsh-release-smoke-'))
  fs.rmSync(resolved, { recursive: true, force: true })
}
