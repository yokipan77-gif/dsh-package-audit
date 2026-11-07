import fs from 'node:fs'
import path from 'node:path'

export const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)

/** Reads metadata only. Never imports the package or runs its lifecycle scripts. */
export function audit(directory, options = {}) {
  const root = path.resolve(directory)
  const findings = []
  const add = (code, message, file = 'package.json', severity = 'error') => findings.push({ code, severity, file, message })
  let manifest
  try {
    const file = path.join(root, 'package.json')
    if (fs.statSync(file).size > 1024 * 1024) throw new Error('package.json exceeds the 1 MiB read limit')
    manifest = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
  } catch (error) {
    add('manifest.read', `Cannot read package.json: ${error.code ?? error.message}. Supply a package directory with valid JSON.`)
    return finish(root, null, findings)
  }
  if (!isObject(manifest)) {
    add('manifest.object', 'package.json must contain a JSON object.')
    return finish(root, null, findings)
  }
  for (const key of ['name', 'version']) {
    if (typeof manifest[key] !== 'string' || !manifest[key].trim()) add(`manifest.${key}`, `Declare a non-empty ${key} in package.json.`)
  }
  if (!isObject(manifest.dsh) || !isObject(manifest.dsh.bundle)) {
    add('bundle.required', 'Declare dsh.bundle with its patch file; dsh.client alone is not an installable bundle.')
  } else {
    const patch = manifest.dsh.bundle.patch
    const patches = Array.isArray(patch) ? patch : [patch]
    if (!patches.length || patches.some(item => typeof item !== 'string' || !item.trim())) {
      add('bundle.patch', 'dsh.bundle.patch must be a non-empty path or ordered array of paths.')
    }
  }
  if (manifest.dsh?.manifestVersion !== undefined && manifest.dsh.manifestVersion !== 1) {
    add('manifest.future', 'Unknown dsh.manifestVersion: this auditor understands version 1. Check the host contract.', 'package.json', 'warning')
  }
  return finish(root, manifest.name ?? null, findings)
}

function finish(root, name, findings) {
  return { schemaVersion: 1, root, name, ok: !findings.some(f => f.severity === 'error'), findings }
}
