/* Self check for the hero card's auto-flip rules. Run: node test_flip.mjs */
import assert from 'node:assert/strict'
import { createFlipClock, FLIP_MS, SETTLE_MS, TICK_MS } from './src/flipclock.js'

const run = (clock, ms, state) => {
  let flips = 0
  for (let t = 0; t < ms; t += TICK_MS) if (clock.tick(TICK_MS, state)) flips++
  return flips
}

/* --- turns over on its own once left alone ------------------------------- */
{
  const c = createFlipClock()
  assert.equal(run(c, FLIP_MS - TICK_MS * 2, { active: true, hovering: false }), 0, 'does not flip early')
  assert.equal(run(c, TICK_MS * 3, { active: true, hovering: false }), 1, 'flips once it is due')
}

/* --- hovering holds it, for as long as you like -------------------------- */
{
  const c = createFlipClock()
  run(c, FLIP_MS * 0.9, { active: true, hovering: false })
  assert.equal(run(c, FLIP_MS * 4, { active: true, hovering: true }), 0,
    'never flips while the pointer is on it, however long it sits there')
}

/* --- leaving a hover costs at least the settle, so it never yanks --------- */
{
  const c = createFlipClock()
  run(c, FLIP_MS * 2, { active: true, hovering: false })   // would have flipped
  c.reset()
  run(c, FLIP_MS - TICK_MS, { active: true, hovering: false })
  run(c, FLIP_MS, { active: true, hovering: true })        // hold well past due
  // now leave: the very next tick must not flip
  assert.equal(c.tick(TICK_MS, { active: true, hovering: false }), false,
    'does not flip on the first tick after the pointer leaves')
  const ticks = Math.floor(SETTLE_MS / TICK_MS)
  assert.equal(run(c, (ticks + 2) * TICK_MS, { active: true, hovering: false }), 1,
    'flips shortly after leaving, within the settle')
}

/* --- off screen or backgrounded time does not count ---------------------- */
{
  const c = createFlipClock()
  assert.equal(run(c, FLIP_MS * 5, { active: false, hovering: false }), 0,
    'a card nobody can see never flips')
  assert.equal(c.elapsed, 0, 'and banks no time while hidden')
}

/* --- a manual flip resets the clock -------------------------------------- */
{
  const c = createFlipClock()
  run(c, FLIP_MS * 0.95, { active: true, hovering: false })
  c.reset()
  assert.equal(run(c, FLIP_MS * 0.9, { active: true, hovering: false }), 0,
    'pressing the button buys a full interval before the next auto flip')
}

console.log(`ok  auto-flips at ${FLIP_MS / 1000}s, holds on hover, settles ${SETTLE_MS}ms after leaving`)
