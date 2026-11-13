import fs from 'node:fs'

/** Read at most one byte beyond the limit, including from non-seekable stdin. */
export function readBounded(fd, limit = 8 * 1024 * 1024) {
  const chunks = []
  let total = 0
  while (true) {
    const chunk = Buffer.alloc(Math.min(64 * 1024, limit - total + 1))
    const size = fs.readSync(fd, chunk, 0, chunk.length, null)
    if (!size) break
    total += size
    if (total > limit) throw new Error(`Pack report exceeds the ${limit}-byte input limit.`)
    chunks.push(chunk.subarray(0, size))
  }
  return Buffer.concat(chunks).toString('utf8')
}
