export function checkBrowser({ manifest, checkFile, add }) {
  if (manifest.browser === undefined) return
  if (typeof manifest.browser === 'string') {
    checkFile(manifest.browser, 'browser')
    return
  }
  if (manifest.browser === null || typeof manifest.browser !== 'object' || Array.isArray(manifest.browser)) {
    add('browser.shape', 'browser must be a file path or replacement map.')
    return
  }
  for (const [request, target] of Object.entries(manifest.browser)) {
    if (target === false) continue // Explicitly disable a server-only module.
    if (typeof target !== 'string' || !target.trim()) {
      add('browser.target', `browser replacement ${request} must be a non-empty module name, relative file or false.`)
    } else if (/^[.\\/]|^[a-z]:/iu.test(target)) {
      checkFile(target, `browser.${request}`)
    } else {
      add('browser.external', `browser.${request} redirects to ${target}; package resolution is not evaluated by this file audit.`, 'package.json', 'note')
    }
  }
}
