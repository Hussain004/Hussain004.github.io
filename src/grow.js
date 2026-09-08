/* ==========================================================================
   The plot. A single plant is watched from four views for a fortnight, then
   the cameras stop and the model keeps going on its own. Everything solid is
   what was observed. Everything translucent is predicted, rolled forward in
   the latent and read back out as a shape and a leaf count.

   That split is the whole point of Agri-JEPA, so it is the only thing this
   scene tries to say.
   ========================================================================== */
import {
  BoxGeometry,
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
  RingGeometry,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

const OBSERVE_S = 8.0        // seconds spent watching
const PREDICT_S = 6.5        // seconds spent dreaming forward
const HOLD_S = 2.6           // seconds on the finished plant before resetting
const CYCLE_S = OBSERVE_S + PREDICT_S + HOLD_S

const DAY_AT_HORIZON = 14    // last observed day
const DAY_AT_END = 24        // last predicted day
const MAX_LEAVES = 13
const GOLDEN = Math.PI * (3 - Math.sqrt(5))   // phyllotaxis, so the spiral reads as a plant

export const leavesByDay = (day) => Math.min(MAX_LEAVES, Math.floor(day / 1.85))
export const LEAVES_AT_HORIZON = leavesByDay(DAY_AT_HORIZON)
export const TIMING = { OBSERVE_S, PREDICT_S, HOLD_S, CYCLE_S, DAY_AT_HORIZON, DAY_AT_END, MAX_LEAVES }

/* Where the cycle is at time t. Kept pure so the observed/predicted split can
   be checked without a GPU. Nothing predicted may appear while observing. */
export function phaseAt(t) {
  const phase = ((t % CYCLE_S) + CYCLE_S) % CYCLE_S
  const observing = phase < OBSERVE_S
  let day
  if (observing) day = (phase / OBSERVE_S) * DAY_AT_HORIZON
  else if (phase < OBSERVE_S + PREDICT_S) {
    day = DAY_AT_HORIZON + ((phase - OBSERVE_S) / PREDICT_S) * (DAY_AT_END - DAY_AT_HORIZON)
  } else day = DAY_AT_END
  return { observing, day, leaves: leavesByDay(day) }
}

export function createGrow(canvas, labelLayer, opts = {}) {
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
  camera.position.set(5.4, 4.3, 6.2)
  camera.lookAt(0, 1.15, 0)

  const p = readPalette()
  const hemi = new HemisphereLight(p.sky, p.ground, 2.2)
  const key = new DirectionalLight(0xffffff, 1.35)
  key.position.set(4, 8, 5)
  scene.add(hemi, key)

  const mats = {
    soil: new MeshLambertMaterial({ color: p.soil }),
    solid: new MeshLambertMaterial({ color: p.stem, flatShading: true }),
    leaf: new MeshLambertMaterial({ color: p.leaf, flatShading: true }),
    // the predicted half, translucent and faintly lit from within
    ghost: new MeshLambertMaterial({
      color: p.dream, emissive: new Color(p.dream).multiplyScalar(0.35),
      transparent: true, opacity: 0.44, flatShading: true, depthWrite: false,
    }),
    rig: new MeshLambertMaterial({ color: p.rig }),
    lens: new MeshLambertMaterial({ color: p.lens }),
  }

  /* ---- soil ---- */
  const soil = new Mesh(new CylinderGeometry(1.5, 1.62, 0.36, 22), mats.soil)
  soil.position.y = -0.18
  world.add(soil)

  /* ---- stem, split at the observation horizon ----
     The lower half is what the cameras saw. The upper half only ever exists
     as a prediction, so it is built from the ghost material. */
  const stemGeo = new CylinderGeometry(0.05, 0.085, 1, 6)
  stemGeo.translate(0, 0.5, 0)                    // grow upward from the base
  const stemSeen = new Mesh(stemGeo, mats.solid)
  const stemDreamt = new Mesh(stemGeo, mats.ghost)
  world.add(stemSeen, stemDreamt)

  /* ---- leaves ---- */
  const leafGeo = new SphereGeometry(1, 7, 5)
  leafGeo.scale(0.40, 0.055, 0.21)
  leafGeo.translate(0.34, 0, 0)                   // offset so the group pivots at the stem

  const leaves = []
  for (let i = 0; i < MAX_LEAVES; i++) {
    const dreamt = i >= LEAVES_AT_HORIZON
    const g = new Group()
    const m = new Mesh(leafGeo, dreamt ? mats.ghost : mats.leaf)
    m.rotation.z = 0.30                            // lift the tip
    g.add(m)
    g.rotation.y = i * GOLDEN
    g.scale.setScalar(0.0001)
    world.add(g)
    leaves.push({ group: g, dreamt })
  }

  /* ---- the four cameras ---- */
  const rigs = []
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4
    const g = new Group()
    g.position.set(Math.cos(a) * 2.15, 0, Math.sin(a) * 2.15)
    g.rotation.y = -a + Math.PI / 2

    const post = new Mesh(new CylinderGeometry(0.028, 0.035, 1.5, 6), mats.rig)
    post.position.y = 0.75
    const head = new Mesh(new RoundedBoxGeometry(0.3, 0.22, 0.2, 2, 0.05), mats.rig)
    head.position.y = 1.6
    const lens = new Mesh(new CylinderGeometry(0.055, 0.055, 0.06, 10), mats.lens)
    lens.rotation.x = Math.PI / 2
    lens.position.set(0, 1.6, -0.12)
    g.add(post, head, lens)

    // the sight line, brightened when this camera takes its turn
    const beam = new Mesh(
      new RingGeometry(0.1, 2.0, 3, 1, 0, 0.30),
      new MeshBasicMaterial({ color: p.leaf, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false })
    )
    beam.rotation.x = -Math.PI / 2
    beam.rotation.z = Math.PI - 0.15
    beam.position.y = 1.58
    g.add(beam)

    world.add(g)
    rigs.push({ group: g, head, beam })
  }

  /* ---- readouts ---- */
  const trait = document.createElement('div')
  trait.className = 'grow-trait'
  labelLayer.appendChild(trait)

  const state = document.createElement('div')
  state.className = 'grow-state'
  labelLayer.appendChild(state)

  /* ---- sizing ---- */
  function resize() {
    const w = canvas.clientWidth || 1
    const h = canvas.clientHeight || 1
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 700 ? 1.6 : 2))
    renderer.setSize(w, h, false)
    const span = 3.5
    const aspect = w / h
    const halfH = aspect > 1 ? span / aspect : span
    camera.left = -halfH * aspect
    camera.right = halfH * aspect
    camera.top = halfH
    camera.bottom = -halfH
    camera.updateProjectionMatrix()
  }
  resize()

  /* ---- the cycle ---- */
  const projected = new Vector3()

  function apply(t) {
    const phase = ((t % CYCLE_S) + CYCLE_S) % CYCLE_S
    const { observing, day } = phaseAt(t)

    const heightAt = (d) => 0.5 + (d / DAY_AT_END) * 1.75
    const h = heightAt(day)
    const hSeen = Math.min(h, heightAt(DAY_AT_HORIZON))

    stemSeen.scale.y = hSeen
    stemDreamt.scale.y = Math.max(h - hSeen, 0.0001)
    stemDreamt.position.y = hSeen
    stemDreamt.visible = !observing

    const grown = leavesByDay(day)
    for (let i = 0; i < leaves.length; i++) {
      const L = leaves[i]
      const want = i < grown ? 1 : 0
      const s = L.group.scale.x
      const next = s + (want - s) * 0.09          // eased in, so leaves unfurl
      L.group.scale.setScalar(Math.max(next, 0.0001))
      // ride up the stem, and sway a little
      L.group.position.y = 0.28 + (i / MAX_LEAVES) * (h * 0.82)
      L.group.rotation.y = i * GOLDEN + Math.sin(t * 0.7 + i) * 0.04
    }

    // cameras take turns while observing, and go quiet once prediction starts
    const turn = Math.floor(phase * 2.2) % 4
    for (let i = 0; i < rigs.length; i++) {
      const active = observing && i === turn
      const m = rigs[i].beam.material
      m.opacity += ((active ? 0.30 : 0) - m.opacity) * 0.14
      const lift = observing ? 1 : 0.55
      rigs[i].head.scale.setScalar(rigs[i].head.scale.x + ((active ? 1.18 : lift) - rigs[i].head.scale.x) * 0.14)
    }

    // readouts
    const d = Math.round(day)
    trait.textContent = `day ${d} · ${grown} ${grown === 1 ? 'leaf' : 'leaves'}`
    trait.classList.toggle('is-dreamt', !observing)
    state.textContent = observing ? 'observing' : 'predicting'
    state.classList.toggle('is-dreamt', !observing)

    projected.set(0, h + 0.75, 0)
    world.localToWorld(projected)
    projected.project(camera)
    trait.style.left = `${(projected.x * 0.5 + 0.5) * canvas.clientWidth}px`
    trait.style.top = `${(-projected.y * 0.5 + 0.5) * canvas.clientHeight}px`
  }

  let raf = 0
  let running = false
  let prev = 0
  let t = 0

  // paint day zero straight away, so the readout is never briefly empty
  // while waiting on the first animation frame
  apply(0)
  renderer.render(scene, camera)
  apply(0)

  function frame() {
    raf = requestAnimationFrame(frame)
    const now = performance.now()
    const dt = Math.min((now - prev) / 1000, 0.05)
    prev = now
    t += dt
    world.rotation.y = Math.sin(t * 0.13) * 0.22
    apply(t)
    renderer.render(scene, camera)
  }

  function refreshTheme() {
    const q = readPalette()
    hemi.color.set(q.sky); hemi.groundColor.set(q.ground)
    mats.soil.color.set(q.soil)
    mats.solid.color.set(q.stem)
    mats.leaf.color.set(q.leaf)
    mats.ghost.color.set(q.dream)
    mats.ghost.emissive.set(new Color(q.dream).multiplyScalar(0.35))
    mats.rig.color.set(q.rig)
    mats.lens.color.set(q.lens)
    for (const r of rigs) r.beam.material.color.set(q.leaf)
    if (!running) { apply(t); renderer.render(scene, camera) }
  }

  return {
    start() { if (!running) { running = true; prev = performance.now(); frame() } },
    stop() { running = false; cancelAnimationFrame(raf) },
    resize,
    renderOnce() {
      // the finished plant, half observed and half predicted
      t = OBSERVE_S + PREDICT_S
      world.rotation.y = 0
      for (let i = 0; i < 80; i++) apply(t)   // let the eased leaf scales settle
      renderer.render(scene, camera)
      apply(t)                                 // reposition the label on current matrices
    },
    refreshTheme,
    dispose() {
      running = false
      cancelAnimationFrame(raf)
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose()
        if (o.material) [].concat(o.material).forEach((m) => m.dispose())
      })
      renderer.dispose()
      trait.remove()
      state.remove()
    },
  }
}

function readPalette() {
  const css = getComputedStyle(document.documentElement)
  const v = (n, f) => new Color(css.getPropertyValue(n).trim() || f)
  const dark = document.documentElement.dataset.theme === 'dark'
  return {
    sky: v('--model-wall', '#fffdf7'),
    ground: v('--model-slab', '#e3d9c2'),
    soil: v('--model-soil', '#c9b79a'),
    stem: v('--sprout', '#27774c'),
    leaf: v('--sprout', '#27774c'),
    dream: v('--peri', '#5563d8'),
    rig: dark ? v('--rule-strong', '#45402f') : v('--ink-3', '#6f695c'),
    lens: v('--ink', '#191712'),
  }
}
