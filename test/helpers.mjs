import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export function fixture(t, overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-package-audit-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const manifest = { name: 'example-plugin', version: '1.0.0', dsh: { bundle: { patch: 'cordis.patch.yml' } }, ...overrides }
  const write = (name, content) => {
    const target = path.join(root, name)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, content)
  }
  write('package.json', JSON.stringify(manifest))
  write('cordis.patch.yml', '- insert:\n    - id: example\n      name: example-plugin\n')
  return { root, manifest, write }
}
