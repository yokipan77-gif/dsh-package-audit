import fs from 'node:fs'
import path from 'node:path'
import { packageFile } from './files.mjs'
import { checkPatches } from './patches.mjs'
import { checkEntries } from './entries.mjs'
import { checkIcon } from './icons.mjs'
import { checkPacklist } from './packlist.mjs'
import { checkCompatibility } from './compatibility.mjs'
import validatePackageName from 'validate-npm-package-name'
import { checkBrowser } from './browser.mjs'

export const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)

/** Reads metadata only. Never imports the package or runs its lifecycle scripts. */
export function audit(directory, options = {}) {
  const root = path.resolve(directory)
  const findings = []
  const add = (code, message, file = 'package.json', severity = 'error') => findings.push({ code, severity, file, message })
  const references = []
  const checkFile = (declared, field) => {
    try {
      const file = packageFile(root, declared)
      references.push({ file: file.relative, field })
      return file
    } catch (error) {
      add('file.invalid', `${field}: ${error.message}`)
      return null
    }
  }
  let manifest
  try {
    const file = packageFile(root, 'package.json').absolute
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
  if (typeof manifest.name === 'string' && manifest.name.trim()) {
    const name = validatePackageName(manifest.name)
    if (!name.validForOldPackages) add('name.invalid', `Invalid npm package name: ${(name.errors ?? []).join('; ')}.`)
    else if (!name.validForNewPackages) add('name.legacy', `Name is only valid for existing packages: ${(name.warnings ?? []).join('; ')}.`, 'package.json', 'warning')
  }
  if (!isObject(manifest.dsh) || !isObject(manifest.dsh.bundle)) {
    add('bundle.required', 'Declare dsh.bundle with its patch file; dsh.client alone is not an installable bundle.')
  } else {
    if (manifest.dsh.bundle.listedByDefault !== undefined && typeof manifest.dsh.bundle.listedByDefault !== 'boolean') {
      add('bundle.listed', 'dsh.bundle.listedByDefault must be a boolean, not a string or number.')
    }
    const patch = manifest.dsh.bundle.patch
    const patches = Array.isArray(patch) ? patch : [patch]
    if (!patches.length || patches.some(item => typeof item !== 'string' || !item.trim())) {
      add('bundle.patch', 'dsh.bundle.patch must be a non-empty path or ordered array of paths.')
    }
  }
  if (manifest.dsh?.manifestVersion !== undefined && manifest.dsh.manifestVersion !== 1) {
    add('manifest.future', 'Unknown dsh.manifestVersion: this auditor understands version 1. Check the host contract.', 'package.json', 'warning')
  }
  checkPatches({ manifest, checkFile, add })
  checkEntries({ root, manifest, checkFile, add })
  checkBrowser({ manifest, checkFile, add })
  checkIcon({ manifest, checkFile, add })
  checkCompatibility({ manifest, add }, options)
  checkPacklist({ root, manifest, references, add }, options.packlist)
  return { ...finish(root, manifest.name ?? null, findings), references }
}

function finish(root, name, findings) {
  return { schemaVersion: 1, root, name, ok: !findings.some(f => f.severity === 'error'), findings }
}
