import fs from 'node:fs'
import path from 'node:path'

/** Resolve only regular files whose real path remains within the package. */
export function packageFile(root, declared) {
  if (typeof declared !== 'string' || !declared.trim()) throw new Error('Expected a non-empty relative file path.')
  if (/^[a-z][a-z\d+.-]*:/iu.test(declared) || /^[\\/]/u.test(declared) || /[\u0000-\u001f]/u.test(declared)) {
    throw new Error('Use a relative path within the package, not a URL or absolute path.')
  }
  const relative = declared.replaceAll('\\', '/')
  const target = path.resolve(root, relative)
  const contains = (parent, child) => {
    const rel = path.relative(parent, child)
    return rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel)
  }
  if (!contains(path.resolve(root), target)) throw new Error('The path leaves the package directory.')
  let real
  try { real = fs.realpathSync(target) } catch (error) {
    throw new Error(`File cannot be read (${error.code}). Build the artifact or correct the path.`)
  }
  if (!contains(fs.realpathSync(root), real)) throw new Error('The symlink target leaves the package directory.')
  if (!fs.statSync(real).isFile()) throw new Error('Expected a regular file, but the path is a directory or special file.')
  return { absolute: real, relative: path.relative(path.resolve(root), target).split(path.sep).join('/') }
}
