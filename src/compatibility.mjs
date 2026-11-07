import semver from 'semver'

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
export function checkCompatibility({ manifest, add }, options) {
  if (typeof manifest.version === 'string' && !semver.valid(manifest.version)) add('version.invalid', 'Set a valid SemVer package version before publishing.')
  if (options.dshVersion && !semver.valid(options.dshVersion)) {
    add('compat.runtime', 'The supplied DSH runtime version is not valid SemVer.')
    return
  }
  if (manifest.engines !== undefined && !object(manifest.engines)) {
    add('compat.engines', 'engines must be an object; the host cannot evaluate this declaration.')
    return
  }
  const requirements = []
  if (Object.hasOwn(manifest.engines ?? {}, 'dsh')) {
    requirements.push(['engines.dsh', manifest.engines.dsh, false])
  } else if (manifest.peerDependencies !== undefined) {
    if (!object(manifest.peerDependencies)) add('compat.peers', 'peerDependencies must be an object.')
    else for (const [name, range] of Object.entries(manifest.peerDependencies)) {
      if (name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-')) requirements.push([name, range, true])
    }
  }
  for (const [field, range, peer] of requirements) {
    if (peer && ['workspace:*', 'workspace:^', 'workspace:~'].includes(range)) continue
    if (typeof range !== 'string' || !range.trim() || semver.validRange(range) === null) {
      add('compat.range', `${field} must be a valid non-empty SemVer range. workspace: is only accepted for DSH peers.`)
    } else if (options.dshVersion && !semver.satisfies(options.dshVersion, range, { includePrerelease: true })) {
      add('compat.dsh', `DSH ${options.dshVersion} does not satisfy ${field}: ${range}. Test and declare the supported host range.`)
    }
  }
  const platforms = manifest.dsh?.bundle?.platforms
  if (platforms !== undefined) {
    if (!Array.isArray(platforms) || platforms.some(p => typeof p !== 'string' || !p.trim())) add('compat.platforms', 'dsh.bundle.platforms must be an array of Node platform names.')
    else if (options.platform && !platforms.includes(options.platform)) add('compat.platform', `Bundle does not declare support for ${options.platform}.`)
  }
}
