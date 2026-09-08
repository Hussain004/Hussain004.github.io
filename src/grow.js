/* ==========================================================================
   One plant, one phone photo, three answers.

   This is the field direction, not the rig. A grower photographs a single
   plant in the ground and gets back what they can act on: how many leaves
   it has and how sure the model is, how far behind its sowing-date
   reference it has fallen, and whether anything on it looks wrong.

   The translucent growth is deliberately NOT "the future". It is where this
   plant should already be by now. The gap between solid and translucent is
   the decision. Absolute age from a single photo is never claimed, which is
   why the readout is a gap against a known sowing date.
   ========================================================================== */
import {
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshLambertMaterial,
  OrthographicCamera,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three'

/* What the grower is told. Held here so the readout and the geometry can
   never drift apart. */
export const REPORT = {
  daysSinceSowing: 30,
  leaves: 7,
  leafError: 1,
  expectedLeaves: 11,
  daysBehind: 8,
  stressLeaf: 3,            // which leaf carries the flag
  stressLabel: 'yellowing, 1 leaf',
}

const MAX_LEAVES = REPORT.expectedLeaves
const GOLDEN = Math.PI * (3 - Math.sqrt(5))

/* The cycle, as cumulative seconds. Each step adds one line to the report. */
export const STEPS = [
  { name: 'capture', until: 2.4 },   // frame the plant
  { name: 'count',   until: 5.4 },   // leaf count, with its error bar
  { name: 'gap',     until: 9.4 },   // the reference it should have matched
  { name: 'stress',  until: 12.6 },  // the flagged leaf
  { name: 'hold',    until: 15.4 },
]
export const CYCLE_S = STEPS[STEPS.length - 1].until

/* How far through the cycle, and how many report lines are showing. */
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

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 60)
  camera.position.set(4.6, 3.4, 6.0)
  camera.lookAt(0, 1.05, 0)

  const p = readPalette()
  const hemi = new HemisphereLight(p.sky, p.ground, 2.2)
  scene.add(hemi, dir(4, 8, 5))

  const mats = {
    soil: new MeshLambertMaterial({ color: p.soil }),
    stem: new MeshLambertMaterial({ color: p.stem, flatShading: true }),
    leaf: new MeshLambertMaterial({ color: p.leaf, flatShading: true }),
    stress: new MeshLambertMaterial({ color: p.stress, flatShading: true }),
    neighbour: new MeshLambertMaterial({ color: p.neighbour, flatShading: true }),
    // where the plant should already be, had it kept up
    ghost: new MeshLambertMaterial({
      color: p.gap, emissive: new Color(p.gap).multiplyScalar(0.3),
      transparent: true, opacity: 0.4, flatShading: true, depthWrite: false,
    }),
  }

  /* ---- ground. Wide and flat, with neighbours cropped by the frame, so it
     reads as a row in a field rather than a pot on a bench. ---- */
  const ground = new Mesh(new CylinderGeometry(4.6, 4.8, 0.4, 26), mats.soil)
  ground.position.y = -0.2
  world.add(ground)

  const leafGeo = new SphereGeometry(1, 7, 5)
  leafGeo.scale(0.40, 0.055, 0.21)
  leafGeo.translate(0.34, 0, 0)
  const stemGeo = new CylinderGeometry(0.05, 0.085, 1, 6)
  stemGeo.translate(0, 0.5, 0)

  // two neighbours, mostly out of frame, to imply the row
  for (const [nx, nz, ns] of [[-2.5, -0.7, 0.75], [2.6, -1.1, 0.62]]) {
    const n = new Group()
    n.position.set(nx, 0, nz)
    n.scale.setScalar(ns)
    const st = new Mesh(stemGeo, mats.neighbour)
    st.scale.y = 1.5
    n.add(st)
    for (let i = 0; i < 6; i++) {
      const m = new Mesh(leafGeo, mats.neighbour)
      m.rotation.z = 0.3
      const g = new Group()
      g.rotation.y = i * GOLDEN
      g.position.y = 0.3 + i * 0.19
      g.add(m)
      n.add(g)
    }
    world.add(n)
  }

  /* ---- the photographed plant ---- */
  const heightFor = (leaves) => 0.55 + leaves * 0.155
  const H_ACTUAL = heightFor(REPORT.leaves)
  const H_EXPECTED = heightFor(REPORT.expectedLeaves)

  const stemSolid = new Mesh(stemGeo, mats.stem)
  stemSolid.scale.y = H_ACTUAL
  world.add(stemSolid)

  // only the shortfall is drawn as a ghost, so the gap is the visible thing
  const stemGap = new Mesh(stemGeo, mats.ghost)
  stemGap.position.y = H_ACTUAL
  stemGap.scale.y = H_EXPECTED - H_ACTUAL
  world.add(stemGap)

  const leaves = []
  for (let i = 0; i < MAX_LEAVES; i++) {
    const missing = i >= REPORT.leaves
    const flagged = !missing && i === REPORT.stressLeaf
    const g = new Group()
    const m = new Mesh(leafGeo, missing ? mats.ghost : (flagged ? mats.stress : mats.leaf))
    m.rotation.z = 0.30
    g.add(m)
    g.rotation.y = i * GOLDEN
    g.position.y = 0.30 + i * 0.155
    g.scale.setScalar(missing ? 0.0001 : 1)
    world.add(g)
    leaves.push({ group: g, mesh: m, missing, flagged })
  }

  /* ---- the report ---- */
  const panel = document.createElement('div')
  panel.className = 'grow-report'
  panel.innerHTML = `
    <p class="grow-since">day ${REPORT.daysSinceSowing} since sowing</p>
    <div class="grow-row" data-row="0"><span>leaf count</span><b>${REPORT.leaves} <i>&plusmn; ${REPORT.leafError}</i></b></div>
    <div class="grow-row is-gap" data-row="1"><span>development</span><b>${REPORT.daysBehind} days behind</b></div>
    <div class="grow-row is-stress" data-row="2"><span>stress</span><b>${REPORT.stressLabel}</b></div>`
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
    const span = 3.1
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
  let ghostEase = 0

  function apply(t) {
    const { index, lines, phase } = phaseAt(t)
    const showGap = index >= 2
    const showStress = index >= 3

    // the shortfall fades in only once the comparison is being made
    const wantGhost = showGap ? 1 : 0
    for (const L of leaves) {
      if (!L.missing) continue
      const s = L.group.scale.x
      L.group.scale.setScalar(Math.max(s + (wantGhost - s) * 0.06, 0.0001))
    }
    ghostEase += (wantGhost - ghostEase) * 0.06
    stemGap.scale.y = Math.max((H_EXPECTED - H_ACTUAL) * ghostEase, 0.0001)

    // the flagged leaf pulses once it is called out
    const flag = leaves[REPORT.stressLeaf]
    if (flag) {
      const pulse = showStress ? 1 + Math.sin(t * 5) * 0.13 : 1
      flag.group.scale.setScalar(pulse)
      flag.mesh.material = showStress ? mats.stress : mats.leaf
    }

    for (let i = 0; i < rows.length; i++) rows[i].classList.toggle('is-on', i < lines)
    // the frame snaps in on capture and stays for the rest of the cycle
    frame.classList.toggle('is-on', phase > 0.35)

    projected.set(0, H_EXPECTED * 0.55, 0)
    world.localToWorld(projected)
    projected.project(camera)
    frame.style.left = `${(projected.x * 0.5 + 0.5) * canvas.clientWidth}px`
    frame.style.top = `${(-projected.y * 0.5 + 0.5) * canvas.clientHeight}px`
  }

  let raf = 0
  let running = false
  let prev = 0
  let t = 0

  apply(0)
  renderer.render(scene, camera)
  apply(0)

  function loop() {
    raf = requestAnimationFrame(loop)
    const now = performance.now()
    const dt = Math.min((now - prev) / 1000, 0.05)
    prev = now
    t += dt
    world.rotation.y = Math.sin(t * 0.12) * 0.16
    apply(t)
    renderer.render(scene, camera)
  }

  return {
    start() { if (!running) { running = true; prev = performance.now(); loop() } },
    stop() { running = false; cancelAnimationFrame(raf) },
    resize,
    renderOnce() {
      t = STEPS[3].until - 0.2          // the complete report
      ghostEase = 1
      world.rotation.y = 0
      for (let i = 0; i < 90; i++) apply(t)
      renderer.render(scene, camera)
      apply(t)
    },
    refreshTheme() {
      const q = readPalette()
      hemi.color.set(q.sky)
      hemi.groundColor.set(q.ground)
      mats.soil.color.set(q.soil)
      mats.stem.color.set(q.stem)
      mats.leaf.color.set(q.leaf)
      mats.stress.color.set(q.stress)
      mats.neighbour.color.set(q.neighbour)
      mats.ghost.color.set(q.gap)
      mats.ghost.emissive.set(new Color(q.gap).multiplyScalar(0.3))
      if (!running) { apply(t); renderer.render(scene, camera) }
    },
    dispose() {
      running = false
      cancelAnimationFrame(raf)
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
  const dark = document.documentElement.dataset.theme === 'dark'
  return {
    sky: v('--model-wall', '#fffdf7'),
    ground: v('--model-slab', '#e3d9c2'),
    soil: v('--model-soil', '#c9b79a'),
    stem: v('--sprout', '#27774c'),
    leaf: v('--sprout', '#27774c'),
    stress: v('--amber', '#d97b1f'),
    gap: v('--peri', '#5563d8'),
    neighbour: dark ? v('--model-slab', '#453d2c') : v('--rule-strong', '#cec5ae'),
  }
}
