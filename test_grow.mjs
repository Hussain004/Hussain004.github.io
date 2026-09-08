/* Self check for the Agri-JEPA field report. Run: node test_grow.mjs
   The demo makes a specific, falsifiable claim about a grower's workflow:
   one photo, then three answers that arrive in a fixed order, and a
   development gap that is only ever stated against a known sowing date. */
import assert from 'node:assert/strict'
import { phaseAt, STEPS, CYCLE_S, REPORT } from './src/grow.js'

/* --- the report builds up in order, never out of it ---------------------- */
assert.equal(phaseAt(0).name, 'capture', 'starts by framing the plant')
assert.equal(phaseAt(0).lines, 0, 'nothing is claimed before the photo is taken')
assert.equal(phaseAt(STEPS[0].until + 0.01).lines, 1, 'leaf count comes first')
assert.equal(phaseAt(STEPS[1].until + 0.01).lines, 2, 'then the development gap')
assert.equal(phaseAt(STEPS[2].until + 0.01).lines, 3, 'then the stress flag')
assert.equal(phaseAt(STEPS[3].until + 0.01).lines, 3, 'the hold keeps the full report')

let prev = 0
for (let t = 0; t < CYCLE_S; t += 0.02) {
  const { lines } = phaseAt(t)
  assert.ok(lines >= prev, `report lines never retract mid-cycle (t=${t.toFixed(2)})`)
  assert.ok(lines >= 0 && lines <= 3, 'line count stays in range')
  prev = lines
}
assert.equal(phaseAt(CYCLE_S + 0.01).lines, 0, 'the cycle restarts clean')
assert.equal(phaseAt(-0.01).name, 'hold', 'negative time wraps rather than throwing')

/* --- the numbers are internally consistent ------------------------------- */
assert.ok(REPORT.expectedLeaves > REPORT.leaves,
  'the plant must be behind its reference, or there is no gap to report')
assert.ok(REPORT.daysBehind > 0, 'the development gap is a real shortfall')
assert.ok(REPORT.leafError >= 1, 'the leaf count is reported with an error bar, never bare')
assert.ok(REPORT.stressLeaf < REPORT.leaves,
  'the flagged leaf has to be one the plant actually has')
assert.ok(REPORT.daysSinceSowing > 0,
  'the gap is stated against a known sowing date, never as absolute age from one photo')

console.log(`ok  ${REPORT.leaves} +/- ${REPORT.leafError} leaves, ${REPORT.daysBehind} days behind at day ${REPORT.daysSinceSowing}, ${STEPS.length} steps in ${CYCLE_S}s`)
