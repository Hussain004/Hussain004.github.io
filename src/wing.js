/* ==========================================================================
   The Wing. A low-poly cutaway of a university floor where a small fleet
   drives the corridor and classifies rooms on sight. This is a toy
   restaging of Hive-Nav, not a decoration, so the behaviour follows the
   real system. Phase 1 is semantic room classification. Rooms double as
   site navigation.
   ========================================================================== */
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Raycaster,
  RingGeometry,
  SRGBColorSpace,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import {
  createMission,
  ROOM_DEFS, ROUTES, STARTS,
  HALF_W, NEAR_Z, FAR_Z, DOOR, WALL_H, WALL_T,
} from './mission.js'

const BODY_COLOURS = ['--amber', '--peri', '--clay']

export function createWing(canvas, labelLayer, opts = {}) {
  const onPick = opts.onPick || (() => {})

  let renderer
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch (err) {
    return null
  }
  if (!renderer.getContext()) return null

  renderer.setClearAlpha(0)

  const scene = new Scene()
  const world = new Group()          // everything tilts and yaws as one
  scene.add(world)

  /* Orthographic keeps the isometric read clean and costs nothing. */
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 120)
  camera.position.set(16, 15, 16)
  camera.lookAt(0, 0, 0)

  const mission = createMission()
  const rooms = mission.rooms

  const palette = readPalette()

  /* ---- lighting. Hemisphere plus one direction gives the clay read
     without a shadow map, which is the single most expensive thing we
     could add here. Contact shadows are faked with blob sprites. ---- */
  const hemi = new HemisphereLight(palette.sky, palette.ground, 2.15)
  const key = new DirectionalLight(0xffffff, 1.5)
  key.position.set(8, 14, 6)
  scene.add(hemi, key)

  const mats = {
    slab:  new MeshLambertMaterial({ color: palette.slab }),
    wall:  new MeshLambertMaterial({ color: palette.wall, flatShading: true }),
    floorBase: palette.floor,
    floorFound: palette.floorFound,
  }

  /* ---- corridor + outer slab ---- */
  const slabGeo = new RoundedBoxGeometry(19.6, 0.5, 12.2, 2, 0.3)
  const slab = new Mesh(slabGeo, mats.slab)
  slab.position.y = -0.3
  world.add(slab)

  const corridor = new Mesh(
    new BoxGeometry(18.6, 0.06, NEAR_Z * 2),
    new MeshLambertMaterial({ color: palette.corridor })
  )
  corridor.position.y = -0.02
  world.add(corridor)

  /* ---- rooms ---- */
  const wallParts = []
  const roomMeshes = []

  rooms.forEach((room) => {
    const zNear = room.side * NEAR_Z
    const zFar = room.side * FAR_Z
    const zMid = room.cz
    const depth = FAR_Z - NEAR_Z

    // floor plate, kept a separate mesh so it can tint when classified
    const plate = new Mesh(
      new BoxGeometry(HALF_W * 2, 0.06, depth),
      new MeshLambertMaterial({ color: mats.floorBase })
    )
    plate.position.set(room.cx, -0.02, zMid)
    plate.userData.room = room
    world.add(plate)
    roomMeshes.push(plate)

    // far wall
    wallParts.push(box(HALF_W * 2 + WALL_T, WALL_H, WALL_T, room.cx, WALL_H / 2, zFar))
    // side walls
    wallParts.push(box(WALL_T, WALL_H, depth, room.cx - HALF_W, WALL_H / 2, zMid))
    wallParts.push(box(WALL_T, WALL_H, depth, room.cx + HALF_W, WALL_H / 2, zMid))
    // near wall, split around the doorway
    const seg = (HALF_W * 2 - DOOR) / 2
    wallParts.push(box(seg, WALL_H, WALL_T, room.cx - HALF_W + seg / 2, WALL_H / 2, zNear))
    wallParts.push(box(seg, WALL_H, WALL_T, room.cx + HALF_W - seg / 2, WALL_H / 2, zNear))

  })

  // one draw call for every wall on the floor
  const walls = new Mesh(mergeGeometries(wallParts), mats.wall)
  world.add(walls)
  wallParts.forEach((g) => g.dispose())

  /* ---- robots ---- */
  const blobTex = blobTexture()
  const robots = ROUTES.map((route, i) => {
    const colour = palette[BODY_COLOURS[i]]
    const g = new Group()

    const body = new Mesh(
      new RoundedBoxGeometry(1.02, 0.46, 1.34, 3, 0.17),
      new MeshLambertMaterial({ color: colour })
    )
    body.position.y = 0.36
    g.add(body)

    const head = new Mesh(
      new RoundedBoxGeometry(0.62, 0.3, 0.42, 3, 0.11),
      new MeshLambertMaterial({ color: palette.head })
    )
    head.position.set(0, 0.7, -0.36)
    g.add(head)

    const lens = new Mesh(
      new CylinderGeometry(0.09, 0.09, 0.08, 12),
      new MeshLambertMaterial({ color: palette.lens })
    )
    lens.rotation.x = Math.PI / 2
    lens.position.set(0, 0.7, -0.58)
    g.add(lens)

    // the lidar puck, which is what the fan below comes out of
    const puck = new Mesh(
      new CylinderGeometry(0.19, 0.21, 0.16, 14),
      new MeshLambertMaterial({ color: palette.head })
    )
    puck.position.set(0, 0.67, 0.3)
    g.add(puck)

    const wheelGeo = new CylinderGeometry(0.2, 0.2, 0.13, 12)
    const wheelMat = new MeshLambertMaterial({ color: palette.wheel })
    const wheels = []
    for (const sx of [-0.56, 0.56]) {
      for (const sz of [-0.42, 0.42]) {
        const w = new Mesh(wheelGeo, wheelMat)
        w.rotation.z = Math.PI / 2
        w.position.set(sx, 0.2, sz)
        g.add(w)
        wheels.push(w)
      }
    }

    // scan fan, only visible while the robot is parked and classifying
    const fan = new Mesh(
      new RingGeometry(0.24, 2.5, 26, 1, 0, 0.95),
      new MeshBasicMaterial({
        color: colour, transparent: true, opacity: 0,
        side: DoubleSide, depthWrite: false,
      })
    )
    fan.rotation.x = -Math.PI / 2
    fan.position.y = 0.66
    g.add(fan)

    const blob = new Mesh(
      new PlaneGeometry(1.9, 1.9),
      new MeshBasicMaterial({ map: blobTex, transparent: true, opacity: 0.22, depthWrite: false })
    )
    blob.rotation.x = -Math.PI / 2
    blob.position.y = 0.035
    g.add(blob)

    world.add(g)

    return {
      group: g, fan, wheels, colour,
      lastOdo: 0,
    }
  })

  robots.forEach((r, i) => r.group.position.set(mission.robots[i].x, 0, mission.robots[i].z))

  /* ---- labels ---- */
  const labels = rooms.map((room) => {
    const el = document.createElement('button')
    el.className = 'room-label'
    el.type = 'button'
    el.style.pointerEvents = 'auto'
    el.innerHTML = `<span class="tick">&#10003;</span>${room.key}`
    el.setAttribute('aria-label', `Go to ${room.hint}`)
    el.addEventListener('click', () => onPick(room.section))
    labelLayer.appendChild(el)
    return el
  })

  /* ---- interaction ---- */
  const ray = new Raycaster()
  const ndc = new Vector2()
  let yaw = 0, yawTarget = 0, tilt = 0, tiltTarget = 0
  let dragging = false, lastX = 0, lastY = 0, moved = 0

  function pointerNdc(e, rect) {
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }

  function onDown(e) {
    dragging = true
    moved = 0
    lastX = e.clientX
    lastY = e.clientY
    canvas.setPointerCapture?.(e.pointerId)
  }

  function onMove(e) {
    const rect = canvas.getBoundingClientRect()
    if (dragging) {
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      moved += Math.abs(dx) + Math.abs(dy)
      yawTarget += dx * 0.006
      tiltTarget = clamp(tiltTarget + dy * 0.003, -0.25, 0.3)
      lastX = e.clientX
      lastY = e.clientY
      return
    }
    // idle parallax, a fraction of the drag range so it never fights the user
    yawTarget = ((e.clientX - rect.left) / rect.width - 0.5) * 0.42
    tiltTarget = ((e.clientY - rect.top) / rect.height - 0.5) * 0.18
    pointerNdc(e, rect)
    hover()
  }

  function onUp(e) {
    if (dragging && moved < 6) {
      pointerNdc(e, canvas.getBoundingClientRect())
      const hit = pick()
      if (hit) onPick(hit.userData.room.section)
    }
    dragging = false
    canvas.releasePointerCapture?.(e.pointerId)
  }

  function onLeave() {
    dragging = false
    yawTarget = 0
    tiltTarget = 0
    canvas.style.cursor = ''
  }

  function pick() {
    ray.setFromCamera(ndc, camera)
    return ray.intersectObjects(roomMeshes, false)[0]?.object || null
  }

  function hover() {
    canvas.style.cursor = pick() ? 'pointer' : ''
  }

  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointerleave', onLeave)

  /* ---- sizing ---- */
  function resize() {
    const w = canvas.clientWidth || 1
    const h = canvas.clientHeight || 1
    const dpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.6 : 2)
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)

    // fit the floor to the box regardless of aspect
    const span = 10.4
    const aspect = w / h
    const halfH = aspect > 1 ? span / aspect : span
    camera.left = -halfH * aspect
    camera.right = halfH * aspect
    camera.top = halfH
    camera.bottom = -halfH
    camera.updateProjectionMatrix()
  }
  resize()

  /* ---- apply simulation state to meshes ----
     mission.js owns the fleet behaviour. Everything here is presentation. */
  function step(dt, elapsed) {
    mission.step(dt)

    for (let i = 0; i < robots.length; i++) {
      const r = robots[i]
      const m = mission.robots[i]
      const scanning = m.state === 'scan'

      // wheels turn by however far the robot actually moved
      const rolled = m.odo - r.lastOdo
      r.lastOdo = m.odo
      for (const w of r.wheels) w.rotation.x += rolled * 5

      const wantFan = scanning ? 0.3 : 0
      r.fan.material.opacity += (wantFan - r.fan.material.opacity) * Math.min(1, dt * (scanning ? 5 : 6))
      if (scanning) r.fan.rotation.z -= dt * 3.6

      r.group.position.set(m.x, Math.sin(elapsed * 2 + m.x) * 0.012, m.z)
      r.group.rotation.y = m.heading
    }

    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i]
      if (room.tint !== room.shownTint) {
        room.shownTint = room.tint
        roomMeshes[i].material.color.copy(mats.floorBase).lerp(mats.floorFound, room.tint)
      }
      labels[i].classList.toggle('is-found', room.found)
    }
  }

  /* ---- label projection ---- */
  const projected = new Vector3()
  function placeLabels() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    for (let i = 0; i < rooms.length; i++) {
      projected.set(rooms[i].cx, 1.35, rooms[i].cz)
      world.localToWorld(projected)
      projected.project(camera)
      labels[i].style.left = `${(projected.x * 0.5 + 0.5) * w}px`
      labels[i].style.top = `${(-projected.y * 0.5 + 0.5) * h}px`
    }
  }

  /* ---- loop ---- */
  let raf = 0
  let last = 0
  let elapsed = 0
  let running = false
  let prev = 0

  function frame() {
    raf = requestAnimationFrame(frame)
    const now = performance.now()
    const dt = Math.min((now - prev) / 1000, 0.05)   // clamp so tab-outs never teleport
    prev = now
    elapsed += dt

    yaw += (yawTarget - yaw) * Math.min(1, dt * 4)
    tilt += (tiltTarget - tilt) * Math.min(1, dt * 4)
    world.rotation.y = yaw
    world.rotation.x = tilt

    step(dt, elapsed)
    renderer.render(scene, camera)
    placeLabels()          // after render, so matrixWorld is current for projection
  }

  function start() {
    if (running) return
    running = true
    prev = performance.now()
    frame()
  }

  function stop() {
    running = false
    cancelAnimationFrame(raf)
  }

  function renderOnce() {
    world.rotation.set(0, 0, 0)
    mission.complete()
    for (let i = 0; i < rooms.length; i++) {
      rooms[i].shownTint = 1
      roomMeshes[i].material.color.copy(mats.floorFound)
      labels[i].classList.add('is-found')
    }
    robots.forEach((r, i) => {
      const m = mission.robots[i]
      r.group.position.set(m.x, 0, m.z)
    })
    renderer.render(scene, camera)
    placeLabels()
  }

  function refreshTheme() {
    const p = readPalette()
    hemi.color.set(p.sky)
    hemi.groundColor.set(p.ground)
    mats.slab.color.set(p.slab)
    mats.wall.color.set(p.wall)
    corridor.material.color.set(p.corridor)
    mats.floorBase = p.floor
    mats.floorFound = p.floorFound
    for (let i = 0; i < rooms.length; i++) {
      roomMeshes[i].material.color.copy(mats.floorBase).lerp(mats.floorFound, rooms[i].tint)
    }
    robots.forEach((r, i) => {
      const c = p[BODY_COLOURS[i]]
      r.group.children[0].material.color.set(c)
      r.fan.material.color.set(c)
    })
    if (!running) renderer.render(scene, camera)
  }

  function dispose() {
    stop()
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('pointerup', onUp)
    canvas.removeEventListener('pointerleave', onLeave)
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) [].concat(o.material).forEach((m) => m.dispose())
    })
    blobTex.dispose()
    renderer.dispose()
  }

  return { start, stop, resize, renderOnce, refreshTheme, dispose }
}

/* -------------------------------------------------------------------------- */

function box(w, h, d, x, y, z) {
  const g = new BoxGeometry(w, h, d)
  g.translate(x, y, z)
  return g
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }

function blobTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(60,45,20,1)')
  g.addColorStop(0.55, 'rgba(60,45,20,0.45)')
  g.addColorStop(1, 'rgba(60,45,20,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

function readPalette() {
  const css = getComputedStyle(document.documentElement)
  const v = (n, fallback) => {
    const raw = css.getPropertyValue(n).trim()
    return new Color(raw || fallback)
  }
  const dark = document.documentElement.dataset.theme === 'dark'
  return {
    sky: v('--model-wall', '#fffdf7'),
    ground: v('--model-slab', '#e3d9c2'),
    slab: v('--model-slab', '#e3d9c2'),
    wall: v('--model-wall', '#fffdf7'),
    corridor: v('--model-corridor', '#ddd3bd'),
    floor: v('--model-floor', '#ece5d5'),
    floorFound: v('--model-found', '#cfe7d8'),
    head: v(dark ? '--rule-strong' : '--ink-3', '#8b8373'),
    lens: v('--ink', '#191712'),
    wheel: v(dark ? '--rule' : '--ink-2', '#565044'),
    '--amber': v('--amber', '#d97b1f'),
    '--peri': v('--peri', '#5563d8'),
    '--clay': v('--clay', '#d4576f'),
  }
}
