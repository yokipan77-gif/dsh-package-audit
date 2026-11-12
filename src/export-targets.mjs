/** Translate a Node export URL to a package-relative filesystem path. */
export function exportPath(target) {
  if (!target.startsWith('./') || target.includes('\\') || /%2f|%5c/iu.test(target)) {
    throw new Error('Export targets must be ./ URLs without backslashes or encoded separators.')
  }
  const pathname = decodeURIComponent(target.split(/[?#]/u, 1)[0])
  if (pathname.slice(2).split('/').some(part => ['.', '..', 'node_modules'].includes(part.toLowerCase()))) {
    throw new Error('Export targets cannot contain dot, parent or node_modules segments, including encoded forms.')
  }
  return pathname
}
