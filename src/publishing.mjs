import semver from 'semver'

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const LIFECYCLE = new Set(['preinstall', 'install', 'postinstall', 'prepare', 'prepack', 'postpack', 'prepublish', 'prepublishOnly', 'publish', 'postpublish'])

/** Metadata-only checks; this module never runs npm or publishes anything. */
export function checkPublishing({ manifest, add }, options) {
  if (!options.publishCheck) return
  if (manifest.private === true) add('publish.private', 'private: true prevents npm publication. Keep it for local-only packages or change it intentionally before publishing.')
  else if (manifest.private !== undefined && typeof manifest.private !== 'boolean') add('publish.private.type', 'private must be a boolean.')
  const config = manifest.publishConfig
  if (config !== undefined) {
    if (!object(config)) add('publish.config', 'publishConfig must be an object.')
    else {
      if (config.access !== undefined && !['public', 'restricted'].includes(config.access)) add('publish.access', 'publishConfig.access must be public or restricted.')
      if (config.tag !== undefined && (typeof config.tag !== 'string' || !config.tag.trim() || semver.validRange(config.tag) !== null)) add('publish.tag', 'publishConfig.tag must be a non-empty tag that is not a SemVer range.')
      if (config.registry !== undefined) {
        try {
          const url = new URL(config.registry)
          if (typeof config.registry !== 'string' || !['https:', 'http:'].includes(url.protocol)) throw new Error('unsupported registry')
        } catch { add('publish.registry', 'publishConfig.registry must be an HTTP(S) registry URL.') }
      }
    }
  }
  if (manifest.scripts !== undefined) {
    if (!object(manifest.scripts)) add('publish.scripts', 'scripts must be an object of command strings.')
    else for (const [name, command] of Object.entries(manifest.scripts)) {
      if (typeof command !== 'string') add('publish.script', `Script ${name} must be a string.`)
      else if (LIFECYCLE.has(name) && command.trim()) add('publish.lifecycle', `Lifecycle script ${name} is declared; this audit does not execute it.`, 'package.json', 'note')
    }
  }
}
