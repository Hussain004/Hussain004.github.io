/* Self check for the Agri-JEPA field plot. Run: node test_grow.mjs
   The demo makes a specific claim: one UAV pass, a forecast for every plant,
   harvest waves read off the forecast, and a single plant flagged because the
   next pass did not match what was forecast for it. */
import assert from 'node:assert/strict'
import { phaseAt, STEPS, CYCLE_S, REPORT, PLANTS, SURPRISE_INDEX } from './src/grow.js'

/* --- the report builds up in order, never out of it ---------------------- */
assert.equal(phaseAt(0).name, 'observe', 'starts with the pass that was flown')
assert.equal(phaseAt(0).lines, 0, 'nothing is claimed before the pass')
assert.equal(phaseAt(STEPS[0].until + 0.01).lines, 1, 'the forecast comes first')
assert.equal(phaseAt(STEPS[1].until + 0.01).lines, 2, 'then the harvest waves')
assert.equal(phaseAt(STEPS[2].until + 0.01).lines, 3, 'then the surprise')
assert.equal(phaseAt(STEPS[3].until + 0.01).lines, 3, 'the hold keeps the full report')

let prev = 0
for (let t = 0; t < CYCLE_S; t += 0.02) {
  const { lines } = phaseAt(t)
  assert.ok(lines >= prev, `report lines never retract mid-cycle (t=${t.toFixed(2)})`)
  prev = lines
}
assert.equal(phaseAt(CYCLE_S + 0.01).lines, 0, 'the cycle restarts clean')
assert.equal(phaseAt(-0.01).name, 'hold', 'negative time wraps rather than throwing')

/* --- the readout and the geometry agree ---------------------------------- */
assert.equal(REPORT.early + REPORT.late, PLANTS.length, 'every plant lands in a wave')
assert.ok(REPORT.early > 0 && REPORT.late > 0, 'two waves, or there is nothing to schedule')
assert.equal(REPORT.surprises, 1, 'exactly one plant is flagged')
assert.ok(PLANTS[SURPRISE_INDEX].surprise, 'the flagged plant is the bracketed one')

for (const [i, q] of PLANTS.entries()) {
  assert.ok(q.forecast > q.now, `plant ${i} is forecast to grow`)
  const ratio = q.next / q.forecast
  if (q.surprise) assert.ok(ratio < 0.8, 'the surprise falls clearly short of its forecast')
  else assert.ok(ratio >= 0.9, `plant ${i} tracks its forecast, so it is not flagged`)
}

// neighbours must not overlap, even at full forecast size
const reach = Math.max(...PLANTS.map((q) => q.forecast)) * 0.74
assert.ok(2 * reach < Math.abs(PLANTS[1].x - PLANTS[0].x), 'forecast canopies stay inside their own spacing')

console.log(`ok  ${PLANTS.length} plants, ${REPORT.early} early / ${REPORT.late} late, ${REPORT.surprises} surprise, ${STEPS.length} steps in ${CYCLE_S}s`)
