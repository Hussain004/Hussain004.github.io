/* ==========================================================================
   The mission simulation, with no rendering in it. Kept separate from
   wing.js so the fleet logic can be exercised headlessly, and so the room
   state belongs to a scene instance rather than to the module.
   ========================================================================== */

/* Floor layout. Two ranks of rooms either side of a central corridor. */
export const HALF_W = 2.9          // room half width along x
export const NEAR_Z = 1.25         // corridor edge
export const FAR_Z = 5.5           // outer wall
export const DOOR = 1.7            // doorway gap
export const WALL_H = 0.92
export const WALL_T = 0.16
export const CENTRE_Z = (NEAR_Z + FAR_Z) / 2

/* Each room owns a site section, so classifying the floor also builds the nav. */
export const ROOM_DEFS = [
  { key: 'lab',      cx: -6.15, side: -1, section: '#research',     hint: 'Research' },
  { key: 'workshop', cx: 0,     side: -1, section: '#projects',     hint: 'Projects' },
  { key: 'archive',  cx: 6.15,  side: -1, section: '#publications', hint: 'Publications' },
  { key: 'studio',   cx: -6.15, side: 1,  section: '#about',        hint: 'About' },
  { key: 'store',    cx: 0,     side: 1,  section: '#certificates', hint: 'Certificates' },
  { key: 'atrium',   cx: 6.15,  side: 1,  section: '#contact',      hint: 'Contact' },
]

/* Routes cross the floor so the fleet visibly redistributes between legs,
   which is what dynamic allocation looks like from above. Robots deploy
   together from the near end of the corridor. */
export const ROUTES = [[0, 4], [1, 5], [2, 3]]
export const STARTS = [-9.0, -7.6, -6.2]

export const SPEED = 3.4           // units per second
export const TURN = 7.0            // radians per second
export const SCAN_TIME = 1.7       // seconds parked in a room, spinning
export const RESET_PAUSE = 3.0     // seconds before the mission restarts
export const ARRIVE = 0.06         // waypoint acceptance radius

/* Shortest-path angle chase, so a robot turning past pi does not unwind
   the long way round. */
export function approachAngle(from, to, maxStep) {
  let diff = ((to - from + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
  if (Math.abs(diff) <= maxStep) return to
  return from + Math.sign(diff) * maxStep
}

export function createMission() {
  const rooms = ROOM_DEFS.map((d) => ({
    ...d,
    cz: d.side * CENTRE_Z,
    doorX: d.cx,
    found: false,
    tint: 0,                       // 0 unclassified, 1 fully tinted, animated between
  }))

  const robots = ROUTES.map((route, i) => ({
    route,
    leg: 0,
    x: STARTS[i],
    z: 0,
    heading: 0,
    state: 'drive',                // drive | scan | idle
    waypoints: [],
    timer: 0,
    odo: 0,                        // distance travelled, drives wheel spin
    target: null,
    inRoom: null,                  // room currently occupied, null on the corridor
  }))

  function assign(r) {
    const room = rooms[r.route[r.leg % r.route.length]]
    r.waypoints = []
    // A robot parked in a room has to come back out through its own doorway
    // first. Heading straight for the next door would cut the near wall.
    if (r.inRoom) {
      r.waypoints.push({ x: r.inRoom.doorX, z: 0 })
      r.inRoom = null
    }
    // then along the corridor centreline, and in at the target doorway
    r.waypoints.push({ x: room.doorX, z: 0 }, { x: room.cx, z: room.cz })
    r.target = room
    r.state = 'drive'
  }
  robots.forEach(assign)

  let allFoundAt = -1
  let elapsed = 0

  function step(dt) {
    elapsed += dt

    for (const r of robots) {
      if (r.state === 'drive') {
        const wp = r.waypoints[0]
        const dx = wp.x - r.x
        const dz = wp.z - r.z
        const dist = Math.hypot(dx, dz)

        if (dist < ARRIVE) {
          r.waypoints.shift()
          if (!r.waypoints.length) {
            r.state = 'scan'
            r.timer = 0
          }
        } else {
          const stepLen = Math.min(SPEED * dt, dist)
          r.x += (dx / dist) * stepLen
          r.z += (dz / dist) * stepLen
          r.odo += stepLen
          r.heading = approachAngle(r.heading, Math.atan2(dx, dz), TURN * dt)
        }
      } else if (r.state === 'scan') {
        r.timer += dt
        r.heading += dt * 1.5        // spin in place, as the real robot does
        if (r.timer > SCAN_TIME) {
          if (r.target) { r.target.found = true; r.inRoom = r.target }
          r.leg += 1
          if (r.leg < r.route.length) assign(r)
          else { r.state = 'idle'; r.waypoints = [] }
        }
      }
    }

    for (const room of rooms) {
      const want = room.found ? 1 : 0
      if (room.tint !== want) {
        room.tint += (want - room.tint) * Math.min(1, dt * 3.5)
        if (Math.abs(want - room.tint) < 0.004) room.tint = want
      }
    }

    // once the floor is fully classified, pause then run the mission again
    if (rooms.every((r) => r.found)) {
      if (allFoundAt < 0) allFoundAt = elapsed
      else if (elapsed - allFoundAt > RESET_PAUSE) {
        allFoundAt = -1
        for (const room of rooms) room.found = false
        for (const r of robots) { r.leg = 0; assign(r) }
      }
    }
  }

  /* Jump straight to the finished state, for reduced-motion and first paint. */
  function complete() {
    for (const room of rooms) { room.found = true; room.tint = 1 }
    robots.forEach((r) => {
      const room = rooms[r.route[0]]
      r.x = room.cx
      r.z = room.cz
      r.state = 'idle'
      r.inRoom = room
      r.waypoints = []
    })
  }

  return { rooms, robots, step, complete }
}
