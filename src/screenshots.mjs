import fs from 'node:fs'
import path from 'node:path'

const HOSTS = new Set(['raw.githubusercontent.com', 'user-images.githubusercontent.com', 'camo.githubusercontent.com', 'github.com'])
export function checkScreenshots({ root, checkFile, add }) {
  try { fs.lstatSync(path.join(root, 'screenshots.json')) } catch (error) {
    if (error.code === 'ENOENT') return
    add('screenshots.read', `Cannot inspect screenshots.json (${error.code}).`)
    return
  }
  const source = checkFile('screenshots.json', 'screenshots', { packed: false })
  if (!source) return
  try {
    if (fs.statSync(source.absolute).size > 1024 * 1024) throw new Error('Screenshot manifest exceeds 1 MiB.')
    const value = JSON.parse(fs.readFileSync(source.absolute, 'utf8').replace(/^\uFEFF/, ''))
    const shots = Array.isArray(value) ? value : value?.screenshots
    if (!Array.isArray(shots) || shots.length < 1 || shots.length > 8) throw new Error('Declare an array of 1–8 screenshots, optionally under the screenshots key.')
    for (const [index, shot] of shots.entries()) {
      const src = typeof shot === 'string' ? shot : shot?.src
      if (typeof src !== 'string' || !src.trim()) throw new Error(`Screenshot ${index + 1} must name a local path or GitHub-hosted HTTPS image URL.`)
      if (/^[a-z][a-z\d+.-]*:/iu.test(src)) {
        const url = new URL(src)
        if (url.protocol !== 'https:' || !HOSTS.has(url.hostname) || url.username || url.password) throw new Error(`Screenshot ${index + 1} must use HTTPS GitHub image hosting.`)
        add('screenshots.remote', `Screenshot ${index + 1} is remote; reachability and image content were not fetched.`, 'screenshots.json', 'note')
      } else if (src.replaceAll('\\', '/').split('/').includes('..')) {
        throw new Error(`Screenshot ${index + 1} contains a parent-directory segment.`)
      } else checkFile(src, `screenshots[${index}]`, { packed: false })
    }
  } catch (error) { add('screenshots.manifest', error.message, 'screenshots.json') }
}
