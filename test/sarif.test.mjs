import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { audit } from '../src/audit.mjs'
import { toSarif } from '../src/sarif.mjs'
import { parseArgs } from '../src/arguments.mjs'
import { fixture } from './helpers.mjs'

test('SARIF contains stable rule indices and escaped workspace-relative locations', t => {
  const f = fixture(t)
  const child = { root: path.join(f.root, 'packages', '插件 one'), findings: [{ code: 'patch.syntax', severity: 'error', file: 'patch #1.yml', message: 'Fix YAML.' }] }
  const sarif = toSarif({ root: f.root, findings: [], packages: [child] })
  const result = sarif.runs[0].results[0]
  assert.equal(result.locations[0].physicalLocation.artifactLocation.uri, 'packages/%E6%8F%92%E4%BB%B6%20one/patch%20%231.yml')
  assert.equal(sarif.runs[0].tool.driver.rules[result.ruleIndex].id, result.ruleId)
  assert.equal(JSON.stringify(sarif).includes(f.root), false)
})
test('clean reports generate empty SARIF results', t => {
  const f = fixture(t)
  assert.deepEqual(toSarif(audit(f.root)).runs[0].results, [])
  assert.throws(() => parseArgs(['--json', '--sarif']))
})

test('SARIF fingerprints survive checkout relocation and distinguish changed findings', () => {
  const report = (directory, message = 'Build the artifact.') => ({ root: path.resolve(directory), findings: [{ code: 'file.invalid', severity: 'error', file: 'package.json', message }] })
  const fingerprint = value => toSarif(value).runs[0].results[0].partialFingerprints['dshFinding/v1']
  assert.equal(fingerprint(report('first-checkout')), fingerprint(report('second-checkout')))
  assert.notEqual(fingerprint(report('first-checkout')), fingerprint(report('first-checkout', 'Correct the declaration.')))
  assert.match(fingerprint(report('first-checkout')), /^[a-f0-9]{64}$/u)
})
test('warnings fail CI only when explicitly requested', t => {
  const f = fixture(t)
  f.manifest.dsh.manifestVersion = 2
  f.write('package.json', JSON.stringify(f.manifest))
  const cli = fileURLToPath(new URL('../bin/audit.mjs', import.meta.url))
  const run = flags => spawnSync(process.execPath, [cli, f.root, ...flags], { encoding: 'utf8' })
  assert.equal(run([]).status, 0)
  const strict = run(['--sarif', '--fail-on-warning'])
  assert.equal(strict.status, 1)
  assert.equal(JSON.parse(strict.stdout).runs[0].results[0].level, 'warning')
})
