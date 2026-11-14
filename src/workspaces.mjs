import fs from 'node:fs'
import path from 'node:path'
import { audit, isObject } from './audit.mjs'
import { packageFile } from './files.mjs'
import { parseDocument } from 'yaml'

/** Audit DSH members of declared npm workspaces, without traversing dependencies. */
export function auditWorkspace(directory, options = {}) {
  let root = path.resolve(directory)
  const packages = []
  const findings = []
  const fail = (message, file = 'package.json') => findings.push({ code: 'workspace.config', severity: 'error', file, message })
  try {
    const rootFile = packageFile(root, 'package.json').absolute
    root = fs.realpathSync(root)
    if (fs.statSync(rootFile).size > 1024 * 1024) throw new Error('Workspace manifest exceeds 1 MiB.')
    const manifest = JSON.parse(fs.readFileSync(rootFile, 'utf8').replace(/^\uFEFF/, ''))
    let patterns = Array.isArray(manifest.workspaces) ? manifest.workspaces : manifest.workspaces?.packages
    let pnpm = false
    if (manifest.workspaces === undefined && fs.existsSync(path.join(root, 'pnpm-workspace.yaml'))) {
      const config = packageFile(root, 'pnpm-workspace.yaml').absolute
      if (fs.statSync(config).size > 1024 * 1024) throw new Error('pnpm-workspace.yaml exceeds 1 MiB.')
      const document = parseDocument(fs.readFileSync(config, 'utf8'))
      if (document.errors.length) throw new Error(`Invalid pnpm-workspace.yaml: ${document.errors[0].message}`)
      const data = document.toJS({ maxAliasCount: 50 })
      if (!isObject(data)) throw new Error('pnpm-workspace.yaml must contain a mapping.')
      pnpm = true
      patterns = data.packages ?? []
      if (manifest.dsh !== undefined) packages.push(audit(root, options))
    }
    if (!pnpm && options.includeRoot) packages.push(audit(root, options))
    if (!Array.isArray(patterns) || (!patterns.length && !pnpm) || patterns.some(p => {
      if (typeof p !== 'string') return true
      const target = p.startsWith('!') ? p.slice(1) : p
      return !target.trim() || target.includes('..') || /^[\\/!]|^[a-z][a-z\d+.-]*:/iu.test(target)
    })) {
      throw new Error('Declare non-empty workspace path patterns inside this repository; parent paths and absolute paths are not supported.')
    }
    const includes = patterns.filter(p => !p.startsWith('!'))
    const exclusions = patterns.filter(p => p.startsWith('!')).map(p => p.slice(1).replaceAll('\\', '/').replace(/\/$/u, '') + '/package.json')
    if (!includes.length && !pnpm) throw new Error('Workspace patterns must include at least one positive path pattern.')
    const seen = new Set(pnpm || options.includeRoot ? [root] : [])
    scan: for (const pattern of includes) {
      const matches = fs.globSync(pattern.replaceAll('\\', '/').replace(/\/$/u, '') + '/package.json', {
        cwd: root, exclude: ['**/node_modules/**', '**/.git/**', ...exclusions],
      })
      for (const file of matches.sort()) {
        try {
          const resolved = packageFile(root, file).absolute
          const memberRoot = fs.realpathSync(path.dirname(path.join(root, file)))
          if (seen.has(memberRoot)) continue
          seen.add(memberRoot)
          if (seen.size > 2000) {
            fail('Workspace exceeds the 2000-package audit limit.')
            break scan
          }
          if (fs.statSync(resolved).size > 1024 * 1024) throw new Error('Member package.json exceeds 1 MiB.')
          let member
          try { member = JSON.parse(fs.readFileSync(resolved, 'utf8').replace(/^\uFEFF/, '')) } catch {
            packages.push(audit(memberRoot, options))
            continue
          }
          // Invalid manifests must reach validation, not the ordinary-library filter.
          if (!isObject(member) || member.dsh !== undefined) packages.push(audit(memberRoot, options))
        } catch (error) { fail(error.message, file.split(path.sep).join('/')) }
      }
    }
    if (!packages.length) fail('No DSH packages were found in the declared workspaces. Check the patterns and dsh declarations.')
  } catch (error) { fail(error.message) }
  packages.sort((a, b) => a.root < b.root ? -1 : a.root > b.root ? 1 : 0)
  return { schemaVersion: 1, root, ok: !findings.length && packages.every(p => p.ok), findings, packages }
}
