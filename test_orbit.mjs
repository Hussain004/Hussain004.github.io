/* Self check for the shared pointer orbit. Run: node test_orbit.mjs
   Both hero scenes share this, so a regression here breaks dragging in two
   places at once. The tap-versus-drag threshold matters most: get it wrong
   and dragging the floor plan starts firing room clicks. */
import assert from 'node:assert/strict'
import { createOrbit } from './src/orbit.js'

class FakeEl extends EventTarget {
  constructor() { super(); this.captured = null }
  getBoundingClientRect() { return { left: 0, top: 0, width: 400, height: 300 } }
  setPointerCapture(id) { this.captured = id }
  releasePointerCapture() { this.captured = null }
}
const ev = (type, x, y) => new (class extends Event {
  constructor() { super(type); this.clientX = x; this.clientY = y; this.pointerId = 1 }
})()

const settle = (o, n = 200) => { for (let i = 0; i < n; i++) o.update(1 / 60) }

/* --- dragging turns the scene ------------------------------------------- */
{
  const el = new FakeEl()
  const o = createOrbit(el)
  el.dispatchEvent(ev('pointerdown', 200, 150))
  el.dispatchEvent(ev('pointermove', 300, 150))
  settle(o)
  assert.ok(o.yaw > 0.4, `dragging right turns the scene, got ${o.yaw.toFixed(3)}`)
  el.dispatchEvent(ev('pointermove', 100, 150))
  settle(o)
  assert.ok(o.yaw < 0, 'dragging back the other way reverses it')
}

/* --- tilt is clamped, so the model never flips under the floor ----------- */
{
  const el = new FakeEl()
  const o = createOrbit(el, { tiltMin: -0.25, tiltMax: 0.3 })
  el.dispatchEvent(ev('pointerdown', 200, 150))
  for (let i = 0; i < 60; i++) el.dispatchEvent(ev('pointermove', 200, 150 + i * 40))
  settle(o)
  assert.ok(o.tilt <= 0.3 + 1e-6, `tilt clamps at the top, got ${o.tilt.toFixed(3)}`)
  for (let i = 0; i < 120; i++) el.dispatchEvent(ev('pointermove', 200, 3000 - i * 40))
  settle(o)
  assert.ok(o.tilt >= -0.25 - 1e-6, `tilt clamps at the bottom, got ${o.tilt.toFixed(3)}`)
}

/* --- a tap is a click, a drag is not ------------------------------------ */
{
  const el = new FakeEl()
  let taps = 0
  const o = createOrbit(el, { tapSlop: 6, onTap: () => taps++ })
  el.dispatchEvent(ev('pointerdown', 200, 150))
  el.dispatchEvent(ev('pointermove', 202, 151))     // 3px of travel
  el.dispatchEvent(ev('pointerup', 202, 151))
  assert.equal(taps, 1, 'a near-still press counts as a click')

  el.dispatchEvent(ev('pointerdown', 200, 150))
  el.dispatchEvent(ev('pointermove', 260, 190))     // a real drag
  el.dispatchEvent(ev('pointerup', 260, 190))
  assert.equal(taps, 1, 'a drag must not fire a click as well')
}

/* --- leaving returns it to rest ----------------------------------------- */
{
  const el = new FakeEl()
  const o = createOrbit(el)
  el.dispatchEvent(ev('pointerdown', 200, 150))
  el.dispatchEvent(ev('pointermove', 340, 260))
  settle(o)
  assert.ok(Math.abs(o.yaw) > 0.1, 'moved off centre')
  el.dispatchEvent(ev('pointerleave', 0, 0))
  settle(o)
  assert.ok(Math.abs(o.yaw) < 0.01 && Math.abs(o.tilt) < 0.01, 'eases back to rest on leave')
}

/* --- engagement is reported once, for retiring the idle drift ------------ */
{
  const el = new FakeEl()
  let engaged = 0
  const o = createOrbit(el, { onEngage: () => engaged++ })
  assert.equal(o.engaged, false, 'starts unengaged')
  el.dispatchEvent(ev('pointerdown', 10, 10))
  el.dispatchEvent(ev('pointerup', 10, 10))
  el.dispatchEvent(ev('pointerdown', 20, 20))
  assert.equal(engaged, 1, 'engagement fires once, not per press')
  assert.equal(o.engaged, true, 'and stays engaged')
}

/* --- listeners come back off -------------------------------------------- */
{
  const el = new FakeEl()
  const o = createOrbit(el)
  o.dispose()
  el.dispatchEvent(ev('pointerdown', 200, 150))
  el.dispatchEvent(ev('pointermove', 400, 150))
  settle(o)
  assert.equal(o.yaw, 0, 'a disposed orbit ignores further pointer events')
}

console.log('ok  orbit drags, clamps tilt, tells taps from drags, and detaches cleanly')
