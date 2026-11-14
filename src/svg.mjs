import fs from 'node:fs'
import { SaxesParser } from 'saxes'

/** XML/root checks only: no rendering, script execution or DTD fetching. */
export function checkSvg(file, add) {
  const parser = new SaxesParser({ xmlns: true })
  let rootSeen = false
  let doctype = false
  let unresolvedEntity = false
  parser.on('doctype', () => { doctype = true })
  parser.on('opentag', tag => {
    if (rootSeen) return
    rootSeen = true
    if (tag.local !== 'svg' || (tag.uri && tag.uri !== 'http://www.w3.org/2000/svg')) {
      throw new Error('Expected an svg root element in the SVG namespace.')
    }
  })
  parser.on('error', error => {
    if (doctype && /undefined entity/iu.test(error.message)) unresolvedEntity = true
    else throw error
  })
  try {
    parser.write(fs.readFileSync(file.absolute, 'utf8').replace(/^\uFEFF/, '')).close()
    if (doctype) add('icon.svg.dtd', 'SVG declares a DTD; DTD definitions and custom entities are not resolved or fetched.', file.relative, unresolvedEntity ? 'warning' : 'note')
  } catch (error) { add('icon.svg', `Cannot validate SVG XML: ${error.message}`, file.relative) }
}
