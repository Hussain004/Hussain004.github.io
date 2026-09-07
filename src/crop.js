/* ==========================================================================
   The plot. A quadcopter flies a boustrophedon survey over a growing stand
   of wheat, which is the acquisition pattern behind the phenotyping paper.
   Stalks are instanced, so the whole scene is a handful of draw calls.
   ========================================================================== */
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

const COLS = 9
const ROWS = 6
const GAP_X = 0.62
const GAP_Z = 0.72
const N = COLS * ROWS

const PLOT_W = (COLS - 1) * GAP_X
const PLOT_D = (ROWS - 1) * GAP_Z

export function createCrop(canvas) {
  let renderer
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' })
  } catch (err) {
    return null
  }
  if (!renderer.getContext()) return null
  renderer.setClearAlpha(0)

  const scene = new Scene()
  const world = new Group()
  scene.add(world)

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 60)
  camera.position.set(6.5, 5.2, 7)
  camera.lookAt(0, 0.5, 0)

  const p = readPalette()

  scene.add(
    new HemisphereLight(p.sky, p.ground, 2.2),
    dirLight(0xffffff, 1.35, 4, 9, 5)
  )

  /* soil */
  const soil = new Mesh(
    new RoundedBoxGeometry(PLOT_W + 1.4, 0.42, PLOT_D + 1.4, 2, 0.16),
    new MeshLambertMaterial({ color: p.soil })
  )
  soil.position.y = -0.21
  world.add(soil)

  /* stalks and heads, one instanced mesh each */
  const stalkGeo = new CylinderGeometry(0.018, 0.038, 1, 5)
  stalkGeo.translate(0, 0.5, 0)                      // pivot at the base so scale grows upward
  const stalks = new InstancedMesh(
    stalkGeo,
    new MeshLambertMaterial({ color: p.stem, flatShading: true }),
    N
  )

  const headGeo = new CylinderGeometry(0.055, 0.02, 0.34, 5)
  headGeo.translate(0, 0.17, 0)
  const heads = new InstancedMesh(
    headGeo,
    new MeshLambertMaterial({ color: p.grain, flatShading: true }),
    N
  )

  stalks.instanceMatrix.setUsage(DynamicDrawUsage)
  heads.instanceMatrix.setUsage(DynamicDrawUsage)
  world.add(stalks, heads)

  /* per plant variation, so the stand does not look stamped */
  const plants = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      plants.push({
        x: -PLOT_W / 2 + c * GAP_X + (Math.random() - 0.5) * 0.14,
        z: -PLOT_D / 2 + r * GAP_Z + (Math.random() - 0.5) * 0.14,
        h: 1.05 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        lean: (Math.random() - 0.5) * 0.16,
        delay: (r * COLS + c) / N * 0.55 + Math.random() * 0.16,
      })
    }
  }

  /* quadcopter */
  const drone = new Group()
  const hull = new Mesh(
    new RoundedBoxGeometry(0.42, 0.14, 0.42, 3, 0.06),
    new MeshLambertMaterial({ color: p.drone })
  )
  drone.add(hull)
  const armMat = new MeshLambertMaterial({ color: p.armour })
  const rotorMat = new MeshBasicMaterial({ color: p.armour, transparent: true, opacity: 0.32 })
  const rotors = []
  for (const [ax, az] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const arm = new Mesh(new BoxGeometry(0.34, 0.045, 0.045), armMat)
    arm.position.set(ax * 0.26, 0, az * 0.26)
    arm.rotation.y = ax * az > 0 ? -Math.PI / 4 : Math.PI / 4
    drone.add(arm)
    const rotor = new Mesh(new CylinderGeometry(0.19, 0.19, 0.012, 12), rotorMat)
    rotor.position.set(ax * 0.4, 0.05, az * 0.4)
    drone.add(rotor)
    rotors.push(rotor)
  }
  // the nadir camera footprint, which is the thing the paper actually collects
  const footprint = new Mesh(
    new ConeGeometry(0.62, 1, 4, 1, true),
    new MeshBasicMaterial({
      color: p.grain, transparent: true, opacity: 0.14,
      side: DoubleSide, depthWrite: false,
    })
  )
  footprint.rotation.y = Math.PI / 4
  drone.add(footprint)
  world.add(drone)

  const dummy = new Object3D()

  function resize() {
    const w = canvas.clientWidth || 1
    const h = canvas.clientHeight || 1
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    renderer.setSize(w, h, false)
    const span = 4.1
    const aspect = w / h
    const halfH = aspect > 1 ? span / aspect : span
    camera.left = -halfH * aspect
    camera.right = halfH * aspect
    camera.top = halfH
    camera.bottom = -halfH
    camera.updateProjectionMatrix()
  }
  resize()

  /* Survey path. Sweeps along x, steps over in z at the end of each pass,
     which is the lawnmower pattern flown for the orthomosaic. */
  function surveyPose(t) {
    const passes = 4
    const cycle = (t / 3.4) % passes
    const pass = Math.floor(cycle)
    const u = cycle - pass
    const dir = pass % 2 === 0 ? 1 : -1
    const span = PLOT_W / 2 + 0.8
    return {
      x: dir * (u * 2 - 1) * span,
      z: -PLOT_D / 2 - 0.2 + (pass / (passes - 1)) * (PLOT_D + 0.4),
      yaw: dir > 0 ? 0 : Math.PI,
    }
  }

  let growth = 0
  function step(dt, t) {
    growth = Math.min(1, growth + dt * 0.34)

    for (let i = 0; i < N; i++) {
      const pl = plants[i]
      // each plant starts a little after the one before it, so the stand fills in
      const g = smooth(clamp01((growth - pl.delay) / (1 - pl.delay)))
      const height = pl.h * g
      const sway = Math.sin(t * 1.5 + pl.phase) * 0.055 * g

      dummy.position.set(pl.x, 0, pl.z)
      dummy.rotation.set(sway, pl.phase, pl.lean + sway)
      dummy.scale.set(1, Math.max(height, 0.0001), 1)
      dummy.updateMatrix()
      stalks.setMatrixAt(i, dummy.matrix)

      // head rides the tip, and only shows once the stalk is most of the way up
      const hs = clamp01((g - 0.55) / 0.45)
      dummy.position.set(pl.x + Math.sin(sway) * height, height, pl.z)
      dummy.rotation.set(sway, pl.phase, pl.lean + sway)
      dummy.scale.setScalar(Math.max(hs, 0.0001))
      dummy.updateMatrix()
      heads.setMatrixAt(i, dummy.matrix)
    }
    stalks.instanceMatrix.needsUpdate = true
    heads.instanceMatrix.needsUpdate = true

    const pose = surveyPose(t)
    drone.position.set(pose.x, 2.5 + Math.sin(t * 2) * 0.05, pose.z)
    drone.rotation.y = pose.yaw
    footprint.position.y = -1.25
    for (const r of rotors) r.rotation.y += dt * 45
  }

  let raf = 0
  let running = false
  let t = 0
  let prev = 0

  function frame() {
    raf = requestAnimationFrame(frame)
    const now = performance.now()
    const dt = Math.min((now - prev) / 1000, 0.05)
    prev = now
    t += dt
    world.rotation.y = Math.sin(t * 0.16) * 0.09
    step(dt, t)
    renderer.render(scene, camera)
  }

  return {
    start() { if (!running) { running = true; prev = performance.now(); frame() } },
    stop() { running = false; cancelAnimationFrame(raf) },
    resize,
    renderOnce() { growth = 1; step(0.016, 1.2); renderer.render(scene, camera) },
    refreshTheme() {
      const q = readPalette()
      soil.material.color.set(q.soil)
      stalks.material.color.set(q.stem)
      heads.material.color.set(q.grain)
      hull.material.color.set(q.drone)
      armMat.color.set(q.armour)
      if (!running) renderer.render(scene, camera)
    },
    dispose() {
      running = false
      cancelAnimationFrame(raf)
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose()
        if (o.material) [].concat(o.material).forEach((m) => m.dispose())
      })
      renderer.dispose()
    },
  }
}

function dirLight(c, i, x, y, z) {
  const l = new DirectionalLight(c, i)
  l.position.set(x, y, z)
  return l
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v }
function smooth(v) { return v * v * (3 - 2 * v) }

function readPalette() {
  const css = getComputedStyle(document.documentElement)
  const v = (n, f) => new Color(css.getPropertyValue(n).trim() || f)
  const dark = document.documentElement.dataset.theme === 'dark'
  return {
    sky: v('--model-wall', '#fffdf7'),
    ground: v('--model-slab', '#e3d9c2'),
    soil: v('--model-soil', '#c9b79a'),
    stem: v('--sprout', '#2f8f5b'),
    grain: v('--amber', '#d97b1f'),
    drone: v('--peri', '#5563d8'),
    armour: dark ? v('--ink-2', '#b3ab98') : v('--ink', '#191712'),
  }
}
