/* Self check for the Agri-JEPA demo cycle. Run with: node test_grow.mjs
   The claim the visual makes is that solid means observed and translucent
   means predicted. That only holds if nothing predicted appears while the
   cameras are still watching, so that is what this pins down. */
import assert from 'node:assert/strict'
import { phaseAt, leavesByDay, LEAVES_AT_HORIZON, TIMING } from './src/grow.js'

const { OBSERVE_S, PREDICT_S, CYCLE_S, DAY_AT_HORIZON, DAY_AT_END, MAX_LEAVES } = TIMING

/* --- the two phases are where they claim to be --------------------------- */
assert.equal(phaseAt(0).observing, true, 'starts by observing')
assert.equal(phaseAt(OBSERVE_S - 0.01).observing, true, 'still observing at the horizon')
assert.equal(phaseAt(OBSERVE_S + 0.01).observing, false, 'predicting just past it')
assert.equal(phaseAt(CYCLE_S - 0.01).observing, false, 'still predicting during the hold')
assert.equal(phaseAt(CYCLE_S + 0.01).observing, true, 'the cycle restarts')

/* --- days advance and stop where they should ----------------------------- */
assert.ok(Math.abs(phaseAt(0).day) < 1e-9, 'day 0 at the start')
assert.ok(Math.abs(phaseAt(OBSERVE_S).day - DAY_AT_HORIZON) < 1e-9, 'horizon lands on the last observed day')
assert.ok(Math.abs(phaseAt(OBSERVE_S + PREDICT_S).day - DAY_AT_END) < 1e-9, 'prediction ends on the last day')
assert.ok(Math.abs(phaseAt(CYCLE_S - 0.001).day - DAY_AT_END) < 1e-6, 'the hold stays on the final plant')

/* --- the core claim: no predicted growth while observing ----------------- */
for (let t = 0; t < OBSERVE_S; t += 0.02) {
  const s = phaseAt(t)
  assert.ok(s.observing, 'phase stays observing')
  assert.ok(
    s.leaves <= LEAVES_AT_HORIZON,
    `no predicted leaf may show while observing, saw ${s.leaves} at t=${t.toFixed(2)}`,
  )
}
// and past the horizon it does grow beyond what was seen
assert.ok(phaseAt(OBSERVE_S + PREDICT_S).leaves > LEAVES_AT_HORIZON, 'prediction adds leaves')

/* --- monotonic, bounded ---------------------------------------------------*/
let prev = -1
for (let t = 0; t < OBSERVE_S + PREDICT_S; t += 0.02) {
  const { day, leaves } = phaseAt(t)
  assert.ok(day >= prev - 1e-9, 'day never runs backwards inside a cycle')
  assert.ok(leaves >= 0 && leaves <= MAX_LEAVES, 'leaf count stays in range')
  prev = day
}
assert.equal(leavesByDay(0), 0, 'no leaves on day zero')
assert.equal(leavesByDay(DAY_AT_END * 10), MAX_LEAVES, 'leaf count saturates')

console.log(`ok  observes to day ${DAY_AT_HORIZON} (${LEAVES_AT_HORIZON} leaves), predicts to day ${DAY_AT_END} (${phaseAt(OBSERVE_S + PREDICT_S).leaves} leaves)`)
