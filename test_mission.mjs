/* Self check for the fleet simulation. Run with: node test_mission.mjs
   Covers the parts that fail silently on screen: angle wrapping, whether
   every room actually gets classified, and whether the mission restarts. */
import assert from 'node:assert/strict'
import {
  createMission, approachAngle, ROOM_DEFS, ROUTES, STARTS,
  HALF_W, DOOR, CENTRE_Z, SCAN_TIME, RESET_PAUSE,
} from './src/mission.js'

/* --- angle wrapping ---------------------------------------------------- */
// 3.0 to -3.0 is 0.28 rad the short way, across pi. Going down through zero
// would be 6.0 rad the wrong way round.
assert.ok(approachAngle(3.0, -3.0, 0.1) > 3.0, 'turns the short way across pi')
assert.ok(approachAngle(-3.0, 3.0, 0.1) < -3.0, 'turns the short way back')
assert.equal(approachAngle(1.0, 1.05, 0.1), 1.05, 'snaps when within one step')
assert.ok(Math.abs(approachAngle(0, Math.PI / 2, 0.1) - 0.1) < 1e-9, 'steps by maxStep')

/* --- layout ------------------------------------------------------------ */
assert.ok(DOOR < HALF_W * 2, 'the doorway is narrower than the wall it sits in')
assert.ok((HALF_W * 2 - DOOR) / 2 > 0.2, 'each side of the doorway leaves a real wall segment')
const ranks = [-1, 1].map((side) => ROOM_DEFS.filter((r) => r.side === side).map((r) => r.cx).sort((a, b) => a - b))
for (const rank of ranks) {
  for (let i = 1; i < rank.length; i++) {
    assert.ok(rank[i] - rank[i - 1] >= HALF_W * 2, 'rooms in a rank do not overlap')
  }
}
assert.equal(new Set(ROOM_DEFS.map((r) => r.section)).size, ROOM_DEFS.length, 'every room maps to a distinct section')
assert.deepEqual(
  [...ROUTES.flat()].sort((a, b) => a - b),
  ROOM_DEFS.map((_, i) => i),
  'the routes cover every room exactly once',
)
assert.equal(STARTS.length, ROUTES.length, 'one start pose per robot')

/* --- the mission actually completes ------------------------------------ */
const m = createMission()
const DT = 1 / 60
const BOUND_X = Math.max(...ROOM_DEFS.map((r) => Math.abs(r.cx))) + HALF_W

let tFound = null
for (let i = 0; i < 60 * 120; i++) {          // two simulated minutes, hard ceiling
  m.step(DT)
  for (const r of m.robots) {
    assert.ok(Math.abs(r.x) <= BOUND_X + 0.01, 'robot stays on the floor in x')
    assert.ok(Math.abs(r.z) <= CENTRE_Z + 0.01, 'robot stays on the floor in z')
    assert.ok(Number.isFinite(r.heading), 'heading stays finite')
  }
  if (tFound === null && m.rooms.every((r) => r.found)) tFound = i * DT
}
assert.ok(tFound !== null, 'every room gets classified')
// Two legs each, so the slowest robot needs both scans plus its driving.
assert.ok(tFound > SCAN_TIME * 2, `classification is not instant, took ${tFound.toFixed(1)}s`)
assert.ok(tFound < 40, `classification finishes promptly, took ${tFound.toFixed(1)}s`)

/* --- and then restarts -------------------------------------------------- */
const m2 = createMission()
let sawComplete = false
let sawRestart = false
for (let i = 0; i < 60 * 120; i++) {
  m2.step(DT)
  const all = m2.rooms.every((r) => r.found)
  if (all) sawComplete = true
  if (sawComplete && !all) { sawRestart = true; break }
}
assert.ok(sawRestart, `mission restarts after the ${RESET_PAUSE}s pause`)

/* --- complete() jumps to the finished state ----------------------------- */
const m3 = createMission()
m3.complete()
assert.ok(m3.rooms.every((r) => r.found && r.tint === 1), 'complete marks every room classified')
assert.ok(m3.robots.every((r) => r.state === 'idle'), 'complete parks the fleet')

console.log(`ok  mission classifies all ${m.rooms.length} rooms in ${tFound.toFixed(1)}s, then restarts`)
