import { checkPlatform } from 'npm-install-checks'

/** Evaluate only explicitly requested dimensions, never the audit host defaults. */
export function checkNpmPlatform({ manifest, add }, options) {
  const invalidLibcTarget = options.libc !== undefined && options.platform !== 'linux'
  if (invalidLibcTarget) add('compat.libc.target', 'A libc target requires an explicit linux platform target.')
  for (const [field, option] of [['os', 'platform'], ['cpu', 'arch'], ['libc', 'libc']]) {
    const declared = manifest[field]
    if (declared === undefined) continue
    const list = typeof declared === 'string' ? [declared] : declared
    if (!Array.isArray(list) || list.some(value => typeof value !== 'string' || !/^!?[a-z0-9_]+$/u.test(value))) {
      add(`compat.${field}.declaration`, `${field} must be a string or array of platform names, optionally prefixed with !.`)
      continue
    }
    const target = options[option]
    if (target === undefined) continue
    if (field === 'libc' && invalidLibcTarget) continue
    if (typeof target !== 'string' || !/^[a-z0-9_]+$/u.test(target)) {
      add(`compat.${field}.target`, `Supply a non-empty target ${field} name.`)
      continue
    }
    try { checkPlatform({ [field]: list }, false, { [field]: target, ...(field === 'libc' ? { os: 'linux' } : {}) }) } catch (error) {
      if (error.code !== 'EBADPLATFORM') throw error
      add(`compat.${field}`, `Target ${field} ${target} does not satisfy package.json ${field}: ${JSON.stringify(declared)}.`)
    }
  }
}
