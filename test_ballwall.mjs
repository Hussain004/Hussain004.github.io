import assert from 'node:assert/strict'
import { futureWeights, ambiguity, P_LEVELS } from './src/ballwall.js'

for (const p of P_LEVELS) {
  for (const cue of [false, true]) {
    for (const outcome of ['cont', 'back']) {
      const w = futureWeights(p, cue, outcome)
      assert.ok(Math.abs(w.cont + w.back - 1) < 1e-12, 'weights sum to 1')
    }
  }
}

assert.deepEqual(futureWeights(0.5, false, 'back'), { cont: 0.5, back: 0.5 }, 'no cue leaves both futures open')
assert.deepEqual(futureWeights(0.25, true, 'back'), { cont: 0, back: 1 }, 'a cue collapses to the true branch')
assert.deepEqual(futureWeights(0.25, true, 'cont'), { cont: 1, back: 0 })
assert.equal(ambiguity(0, false), 0, 'p = 0 has no ambiguity')
assert.equal(ambiguity(0.5, false), 1, 'p = 0.5 is the maximum')
assert.ok(ambiguity(0.25, false) > 0 && ambiguity(0.25, false) < 1)
assert.equal(ambiguity(0.5, true), 0, 'a cue removes ambiguity')

console.log('ok  ball and wall weights sum to 1, cue collapses the branch, ambiguity peaks at p = 0.5')
