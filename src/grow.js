/* ==========================================================================
   A field plot, one UAV pass, and a forecast in latent space.

   Agri-JEPA is a world model of plant growth trained on small data, with
   a small part of its latent anchored to real plant state. In the field
   that buys two things a grower can use. Rolling the latent forward says
   which plants will be ready in which harvest wave, weeks before the cut.
   And when the next pass arrives, a plant that does not match its own
   forecast is a surprise, which is an early stress warning that no single
   frame shows.

   The translucent domes are forecasts, not measurements. Nothing here is
   read off one photo as an absolute age.
   ========================================================================== */
import {
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  OrthographicCamera,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three'
import { createOrbit } from './orbit.js'

/* ---- the plot, as data, so the readout and the geometry cannot drift ---- */
const COLS = 5
const ROWS = 4
const SPACING = 1.25
const LEAVES = 7
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const hash = (i) => { const s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s) }

export const SURPRISE_INDEX = 7      // an interior plant, so it reads as part of the crop

export const PLANTS = Array.from({ length: COLS * ROWS }, (_, i) => {
  const now = 0.40 + hash(i + 1) * 0.10
  const forecast = now * 1.6
  const surprise = i === SURPRISE_INDEX
  return {
    x: ((i % COLS) - (COLS - 1) / 2) * SPACING,
    z: (Math.floor(i / COLS) - (ROWS - 1) / 2) * SPACING,
    now,
    forecast,
    // what the next pass actually sees. Everyone tracks their forecast but one.
    next: surprise ? now * 1.12 : forecast * (0.95 + hash(i + 40) * 0.05),
    wave: hash(i + 7) > 0.55 ? 'early' : 'late',
    surprise,
    spin: hash(i + 90) * Math.PI * 2,
  }
})

export const REPORT = {
  daysAfterPlanting: 27,
  horizonWeeks: 3,
  early: PLANTS.filter((p) => p.wave === 'early').length,
  late: PLANTS.filter((p) => p.wave === 'late').length,
  surprises: PLANTS.filter((p) => p.surprise).length,
}

/* The cycle, as cumulative seconds. Each step adds one line to the report. */
export const STEPS = [
  { name: 'observe',  until: 2.4 },   // the pass that is actually flown
  { name: 'forecast', until: 5.6 },   // every plant rolled forward in latent
  { name: 'harvest',  until: 9.2 },   // forecasts read out as harvest waves
  { name: 'surprise', until: 12.8 },  // the next pass, against the forecast
  { name: 'hold',     until: 15.6 },
]
export const CYCLE_S = STEPS[STEPS.length - 1].until

export function phaseAt(t) {
  const phase = ((t % CYCLE_S) + CYCLE_S) % CYCLE_S
  let index = STEPS.findIndex((s) => phase < s.until)
  if (index < 0) index = STEPS.length - 1
  return { phase, index, name: STEPS[index].name, lines: Math.min(index, 3) }
}

export function createGrow(canvas, labelLayer) {
  let renderer
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' })
  } catch (err) { return null }
  if (!renderer.getContext()) return null
  renderer.setClearAlpha(0)

  const scene = new Scene()
  const world = new Group()
  scene.add(world)

  // high and to one side, the way the plot is seen from the drone
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 80)
  camera.position.set(6.5, 8.0, 7.5)
  camera.lookAt(0, -0.2, 0)

  const p = readPalette()
  const hemi = new HemisphereLight(p.sky, p.ground, 2.2)
  scene.add(hemi, dir(4, 9, 5))

  const mats = {
    soil: new MeshLambertMaterial({ color: p.soil }),
    leaf: new MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
    curd: new MeshLambertMaterial({ color: p.curd, flatShading: true }),
    ghost: new MeshLambertMaterial({
      color: 0xffffff, transparent: true, opacity: 0.32, flatShading: true, depthWrite: false,
    }),
  }

  const bed = new Mesh(new BoxGeometry(COLS * SPACING + 0.5, 0.3, ROWS * SPACING + 0.5), mats.soil)
  bed.position.y = -0.15
  world.add(bed)

  /* ---- three draw calls for the whole crop ---- */
  const leafGeo = new SphereGeometry(1, 7, 5)
  leafGeo.scale(0.40, 0.06, 0.21)
  leafGeo.translate(0.34, 0, 0)
  const leaves = new InstancedMesh(leafGeo, mats.leaf, PLANTS.length * LEAVES)
  const curds = new InstancedMesh(new SphereGeometry(0.16, 8, 5), mats.curd, PLANTS.length)
  const domeGeo = new SphereGeometry(0.74, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)
  const domes = new InstancedMesh(domeGeo, mats.ghost, PLANTS.length)
  world.add(leaves, curds, domes)

  const dummy = new Object3D()
  dummy.rotation.order = 'YXZ'
  const tmp = new Color()
  const size = PLANTS.map((q) => q.now)        // eased, what the solid plant shows
  const dome = PLANTS.map(() => 0)             // eased, how far the forecast has grown in
  const domeTint = PLANTS.map(() => new Color(p.peri))

  function writePlant(i, t, surpriseOn) {
    const q = PLANTS[i]
    const s = size[i]
    const flagged = q.surprise && surpriseOn
    tmp.set(flagged ? p.amber : p.sprout)
    for (let k = 0; k < LEAVES; k++) {
      dummy.position.set(q.x, 0.04, q.z)
      dummy.rotation.set(0, q.spin + k * GOLDEN, -0.32 + k * 0.03)
      const pulse = flagged ? 1 + Math.sin(t * 5) * 0.08 : 1
      dummy.scale.setScalar(s * pulse)
      dummy.updateMatrix()
      leaves.setMatrixAt(i * LEAVES + k, dummy.matrix)
      leaves.setColorAt(i * LEAVES + k, tmp)
    }
    dummy.rotation.set(0, 0, 0)
    dummy.position.set(q.x, 0.08 + s * 0.12, q.z)
    dummy.scale.setScalar(Math.max(s - 0.35, 0.0001) * 2.4)
    dummy.updateMatrix()
    curds.setMatrixAt(i, dummy.matrix)

    const d = Math.max(dome[i], 0.0001)
    dummy.position.set(q.x, 0.02, q.z)
    dummy.scale.set(q.forecast * d, q.forecast * d * 0.45, q.forecast * d)
    dummy.updateMatrix()
    domes.setMatrixAt(i, dummy.matrix)
    domes.setColorAt(i, domeTint[i])
  }

  /* ---- the report ---- */
  const panel = document.createElement('div')
  panel.className = 'grow-report'
  panel.innerHTML = `
    <p class="grow-since">day ${REPORT.daysAfterPlanting} after planting, one UAV pass</p>
    <div class="grow-row" data-row="0"><span>forecast</span><b>${REPORT.horizonWeeks} weeks ahead</b></div>
    <div class="grow-row is-gap" data-row="1"><span>harvest wave</span><b>${REPORT.early} early <i>&middot;</i> ${REPORT.late} late</b></div>
    <div class="grow-row is-stress" data-row="2"><span>next pass</span><b>${REPORT.surprises} plant off forecast</b></div>`
  labelLayer.appendChild(panel)
  const rows = [...panel.querySelectorAll('.grow-row')]

  const frame = document.createElement('div')
  frame.className = 'grow-frame'
  frame.innerHTML = '<i></i><i></i><i></i><i></i>'
  labelLayer.appendChild(frame)

  /* ---- sizing ---- */
  function resize() {
    const w = canvas.clientWidth || 1
    const h = canvas.clientHeight || 1
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 700 ? 1.6 : 2))
    renderer.setSize(w, h, false)
    const span = 3.9
    const aspect = w / h
    const halfH = aspect > 1 ? span / aspect : span
    camera.left = -halfH * aspect
    camera.right = halfH * aspect
    camera.top = halfH
    camera.bottom = -halfH
    camera.updateProjectionMatrix()
  }
  resize()

  /* ---- interaction ---- */
  const orbit = createOrbit(canvas, { parallaxYaw: 0.30, parallaxTilt: 0.10 })
  let sway = 1

  /* ---- the cycle ---- */
  const projected = new Vector3()
  const ease = (a, b, k) => a + (b - a) * k

  function apply(t, k = 0.06) {
    const { index, lines } = phaseAt(t)
    const surpriseOn = index >= 3
    for (let i = 0; i < PLANTS.length; i++) {
      const q = PLANTS[i]
      // the restart snaps back to the observed pass rather than shrinking slowly
      size[i] = index === 0 ? q.now : ease(size[i], surpriseOn ? q.next : q.now, k)
      dome[i] = index === 0 ? ease(dome[i], 0, 0.25) : ease(dome[i], 1, k)
      const target = index >= 2 ? (q.wave === 'early' ? p.sprout : p.peri) : p.peri
      domeTint[i].lerp(target, k)
      writePlant(i, t, surpriseOn)
    }
    leaves.instanceMatrix.needsUpdate = true
    leaves.instanceColor.needsUpdate = true
    curds.instanceMatrix.needsUpdate = true
    domes.instanceMatrix.needsUpdate = true
    domes.instanceColor.needsUpdate = true

    for (let i = 0; i < rows.length; i++) rows[i].classList.toggle('is-on', i < lines)
    frame.classList.toggle('is-on', surpriseOn)

    const s = PLANTS[SURPRISE_INDEX]
    projected.set(s.x, 0.2, s.z)
    world.localToWorld(projected)
    projected.project(camera)
    frame.style.left = `${(projected.x * 0.5 + 0.5) * canvas.clientWidth}px`
    frame.style.top = `${(-projected.y * 0.5 + 0.5) * canvas.clientHeight}px`
  }

  let raf = 0
  let running = false
  let prev = 0
  let t = 0

  apply(0, 1)
  renderer.render(scene, camera)
  apply(0, 1)

  function loop() {
    raf = requestAnimationFrame(loop)
    const now = performance.now()
    const dt = Math.min((now - prev) / 1000, 0.05)
    prev = now
    t += dt
    if (orbit.engaged) sway += (0 - sway) * Math.min(1, dt * 2)
    orbit.update(dt)
    world.rotation.y = Math.sin(t * 0.12) * 0.16 * sway + orbit.yaw
    world.rotation.x = orbit.tilt
    apply(t)
    renderer.render(scene, camera)
  }

  return {
    start() { if (!running) { running = true; prev = performance.now(); loop() } },
    stop() { running = false; cancelAnimationFrame(raf) },
    resize,
    renderOnce() {
      t = STEPS[3].until - 0.2          // the complete report
      orbit.reset()
      world.rotation.set(0, 0, 0)
      apply(t, 1)
      renderer.render(scene, camera)
      apply(t, 1)
    },
    refreshTheme() {
      const q = readPalette()
      Object.assign(p, q)
      hemi.color.set(q.sky)
      hemi.groundColor.set(q.ground)
      mats.soil.color.set(q.soil)
      mats.curd.color.set(q.curd)
      if (!running) { apply(t, 1); renderer.render(scene, camera) }
    },
    dispose() {
      running = false
      cancelAnimationFrame(raf)
      orbit.dispose()
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose()
        if (o.material) [].concat(o.material).forEach((m) => m.dispose())
      })
      renderer.dispose()
      panel.remove()
      frame.remove()
    },
  }
}

function dir(x, y, z) {
  const l = new DirectionalLight(0xffffff, 1.35)
  l.position.set(x, y, z)
  return l
}

function readPalette() {
  const css = getComputedStyle(document.documentElement)
  const v = (n, f) => new Color(css.getPropertyValue(n).trim() || f)
  return {
    sky: v('--model-wall', '#fffdf7'),
    ground: v('--model-slab', '#e3d9c2'),
    soil: v('--model-soil', '#c9b79a'),
    curd: v('--model-wall', '#fffdf7'),
    sprout: v('--sprout', '#27774c'),
    amber: v('--amber', '#d97b1f'),
    peri: v('--peri', '#5563d8'),
  }
}
