import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { ROOM_DEFS } from './src/mission.js'

const html = readFileSync('./index.html', 'utf8')
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))

// every in-page link lands on something
for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(id), `href="#${id}" has no target`)
for (const [, id] of html.matchAll(/data-open="([^"]+)"/g)) {
  assert.ok(ids.has(id), `data-open="${id}" has no dialog`)
  assert.match(html, new RegExp(`<dialog[^>]*id="${id}"`), `${id} is not a dialog`)
}
for (const room of ROOM_DEFS) assert.ok(ids.has(room.section.slice(1)), `room ${room.key} points at missing ${room.section}`)

// every local image exists
for (const [, src] of html.matchAll(/src="(\/[^"]+\.(?:webp|png|jpg|svg))"/g)) {
  assert.ok(existsSync(`./public${src}`), `missing image ${src}`)
}

// copy rules: no em or en dashes, no venue named for Agri-JEPA
assert.ok(!/[–—]/.test(html), 'em or en dash in index.html')
assert.ok(!/CVPR|ICML|WACV/.test(html), 'a venue is named for Agri-JEPA')

// private repositories stay unlinked
for (const repo of ['Agri-JEPA', 'localization-under-change', 'DL4STG-Project', 'hive-nav-sim', 'hive-nav']) {
  assert.ok(!new RegExp(`github\\.com/Hussain004/${repo}(?![\\w-])`, 'i').test(html), `links private repo ${repo}`)
}

console.log(`ok  ${ids.size} ids, links and dialogs resolve, images exist, copy rules hold`)
