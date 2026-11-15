import npa from 'npm-package-arg'
import validateName from 'validate-npm-package-name'

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)

/** Parse metadata only: never fetch dependencies, registries or local packages. */
export function checkDependencies({ root, manifest, add }) {
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    if (manifest[field] === undefined) continue
    if (!object(manifest[field])) {
      add('dependency.map', `${field} must map package names to specifier strings.`)
      continue
    }
    for (const [name, spec] of Object.entries(manifest[field])) {
      if (!validateName(name).validForOldPackages) {
        add('dependency.name', `${field} contains an invalid npm package name: ${name}.`)
        continue
      }
      if (typeof spec !== 'string' || !spec.trim()) {
        add('dependency.spec', `${field}.${name} requires a non-empty package specifier string.`)
        continue
      }
      // Workspace managers rewrite these before publication. Recognize the
      // protocols without pretending to resolve their separate configuration.
      if (/^(?:workspace|link|catalog):/u.test(spec)) {
        if (!spec.startsWith('catalog:') && !spec.slice(spec.indexOf(':') + 1).trim()) {
          add('dependency.spec', `${field}.${name} has an empty workspace or link target.`)
        } else add('dependency.workspace', `${field}.${name} uses a workspace-manager protocol; its target is not resolved.`, 'package.json', 'note')
        continue
      }
      try {
        const parsed = npa.resolve(name, spec, root)
        if (!parsed.registry && parsed.type !== 'alias') add('dependency.external', `${field}.${name} uses a ${parsed.type} source; availability and contents are not verified.`, 'package.json', 'note')
      } catch {
        // Parser messages may contain credential-bearing URLs. Report only the
        // field name, never the raw specifier or the parser's error text.
        add('dependency.spec', `${field}.${name} has an invalid npm package specifier.`)
      }
    }
  }
  if (manifest.peerDependenciesMeta !== undefined) {
    if (!object(manifest.peerDependenciesMeta)) add('dependency.peer.meta', 'peerDependenciesMeta must be an object.')
    else for (const [name, value] of Object.entries(manifest.peerDependenciesMeta)) {
      if (!object(value) || (value.optional !== undefined && typeof value.optional !== 'boolean')) {
        add('dependency.peer.meta', `peerDependenciesMeta.${name} must be an object with a boolean optional flag when present.`)
      }
    }
  }
}
