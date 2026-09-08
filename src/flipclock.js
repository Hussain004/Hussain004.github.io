/* ==========================================================================
   The clock behind the hero card turning itself over. Pure, so the hold
   rules can be checked without a browser.

   Rules, in the order they matter:
   - the card turns over after FLIP_MS of time the viewer could actually see
   - hovering never advances the clock, and never turns the card
   - leaving a hover always costs at least SETTLE_MS, so it never yanks
     the moment the pointer moves away
   - time spent off screen or in a background tab does not count
   ========================================================================== */
export const FLIP_MS = 25000
export const SETTLE_MS = 700
export const TICK_MS = 200

export function createFlipClock({ flipMs = FLIP_MS, settleMs = SETTLE_MS } = {}) {
  let elapsed = 0
  return {
    get elapsed() { return elapsed },
    get progress() { return Math.min(elapsed / flipMs, 1) },
    reset() { elapsed = 0 },
    tick(dt, { active, hovering }) {
      if (hovering) elapsed = Math.min(elapsed, flipMs - settleMs)
      else if (active) elapsed += dt
      if (elapsed >= flipMs) { elapsed = 0; return true }
      return false
    },
  }
}
