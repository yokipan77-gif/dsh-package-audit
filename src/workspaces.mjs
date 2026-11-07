import fs from 'node:fs'
import path from 'node:path'
import { audit } from './audit.mjs'
import { packageFile } from './files.mjs'

/** Audit DSH members of declared npm workspaces, without traversing dependencies. */
export function auditWorkspace(directory, options = {}) {
  const root = path.resolve(directory)
  const packages = []
  const findings = []
  const fail = (message, file = 'package.json') => findings.push({ code: 'workspace.config', severity: 'error', file, message })
  try {
    const rootFile = packageFile(root, 'package.json').absolute
    if (fs.statSync(rootFile).size > 1024 * 1024) throw new Error('Workspace manifest exceeds 1 MiB.')
    const manifest = JSON.parse(fs.readFileSync(rootFile, 'utf8').replace(/^\uFEFF/, ''))
    const patterns = Array.isArray(manifest.workspaces) ? manifest.workspaces : manifest.workspaces?.packages
    if (!Array.isArray(patterns) || !patterns.length || patterns.some(p => typeof p !== 'string' || !p.trim() || p.includes('..') || /^[\\/!]|^[a-z][a-z\d+.-]*:/iu.test(p))) {
      throw new Error('Declare non-empty npm workspace path patterns inside this repository; parent paths, absolute paths and exclusions are not supported.')
    }
    const seen = new Set()
    for (const pattern of patterns) {
      const matches = fs.globSync(pattern.replaceAll('\\', '/').replace(/\/$/u, '') + '/package.json', {
        cwd: root, exclude: ['**/node_modules/**', '**/.git/**'],
      })
      for (const file of matches.sort()) {
        try {
          const resolved = packageFile(root, file).absolute
          if (seen.has(resolved)) continue
          seen.add(resolved)
          if (seen.size > 2000) throw new Error('Workspace exceeds the 2000-package audit limit.')
          if (fs.statSync(resolved).size > 1024 * 1024) throw new Error('Member package.json exceeds 1 MiB.')
          let member
          try { member = JSON.parse(fs.readFileSync(resolved, 'utf8').replace(/^\uFEFF/, '')) } catch {
            packages.push(audit(path.dirname(resolved), options))
            continue
          }
          if (member?.dsh !== undefined) packages.push(audit(path.dirname(resolved), options))
        } catch (error) { fail(error.message, file.split(path.sep).join('/')) }
      }
    }
    if (!packages.length) fail('No DSH packages were found in the declared workspaces. Check the patterns and dsh declarations.')
  } catch (error) { fail(error.message) }
  packages.sort((a, b) => a.root.localeCompare(b.root))
  return { schemaVersion: 1, root, ok: !findings.length && packages.every(p => p.ok), findings, packages }
}
