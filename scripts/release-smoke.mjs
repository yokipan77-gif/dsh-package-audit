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
  const packed = spawnSync(process.execPath, [npmCli, 'pack', '--json', '--ignore-scripts', '--offline', '--pack-destination', temporary], {
    cwd: project, encoding: 'utf8', timeout: 30_000,
  })
  assert.equal(packed.status, 0, packed.stderr || packed.error?.message)
  const distribution = JSON.parse(packed.stdout)[0]
  const installedRoot = path.join(temporary, 'installation')
  fs.mkdirSync(installedRoot)
  const packageMetadata = JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf8'))
  const archiveSpec = `file:../${distribution.filename}`
  const installation = { name: 'dsh-audit-release-test', version: '1.0.0', private: true, dependencies: { [packageMetadata.name]: archiveSpec } }
  const lock = JSON.parse(fs.readFileSync(path.join(project, 'package-lock.json'), 'utf8'))
  lock.name = installation.name
  lock.version = installation.version
  lock.packages[''] = installation
  lock.packages[`node_modules/${packageMetadata.name}`] = {
    version: packageMetadata.version, resolved: archiveSpec, integrity: distribution.integrity,
    dependencies: packageMetadata.dependencies, bin: packageMetadata.bin, engines: packageMetadata.engines,
  }
  fs.writeFileSync(path.join(installedRoot, 'package.json'), JSON.stringify(installation))
  fs.writeFileSync(path.join(installedRoot, 'package-lock.json'), JSON.stringify(lock))
  // npm ci caches tarballs, not necessarily packuments. Reuse exact locked
  // dependency URLs/integrities so offline installation needs no metadata.
  const installed = spawnSync(process.execPath, [npmCli, 'ci', '--prefix', installedRoot, '--ignore-scripts', '--offline', '--no-audit', '--no-fund'], {
    cwd: temporary, encoding: 'utf8', timeout: 60_000,
  })
  assert.equal(installed.status, 0, installed.stderr || installed.error?.message)
  manifest.files = ['index.mjs', 'assets', 'cordis.patch.yml']
  fs.writeFileSync(manifestPath, JSON.stringify(manifest))
  const installedCli = path.join(installedRoot, 'node_modules', '@yokipan77', 'dsh-package-audit', 'bin', 'audit.mjs')
  for (const format of ['--json', '--sarif', '--markdown']) {
    const output = path.join(temporary, `installed-${format.slice(2)}.txt`)
    const result = spawnSync(process.execPath, [installedCli, sample, format, '--output', output], { encoding: 'utf8', timeout: 10_000 })
    assert.equal(result.status, 0, result.stderr)
    const text = fs.readFileSync(output, 'utf8')
    if (format === '--json') assert.equal(JSON.parse(text).ok, true)
    if (format === '--sarif') assert.equal(JSON.parse(text).version, '2.1.0')
    if (format === '--markdown') assert.ok(text.includes('No findings.'))
  }
  console.log('Release smoke passed: packlist, omitted patch, script-free audit, offline tarball installation and installed CLI in three report formats.')
} finally {
  const resolved = path.resolve(temporary)
  assert.ok(path.dirname(resolved) === path.resolve(os.tmpdir()) && path.basename(resolved).startsWith('dsh-release-smoke-'))
  fs.rmSync(resolved, { recursive: true, force: true })
}
