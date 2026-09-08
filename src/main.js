import './style.css'
import { createFlipClock, TICK_MS } from './flipclock.js'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const $ = (sel, root = document) => root.querySelector(sel)
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]

/* --------------------------------------------------------------------------
   Theme
   -------------------------------------------------------------------------- */
const themeListeners = new Set()

function applyTheme(name) {
  document.documentElement.dataset.theme = name
  try { localStorage.setItem('theme', name) } catch {}
  themeListeners.forEach((fn) => fn(name))
}

$('#theme-toggle')?.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')
})

/* --------------------------------------------------------------------------
   Navigation
   -------------------------------------------------------------------------- */
const nav = $('#nav')
const menu = $('#nav-menu')

$('#nav-toggle')?.addEventListener('click', () => {
  menu.classList.toggle('is-open')
})
menu?.addEventListener('click', (e) => {
  if (e.target.closest('a')) menu.classList.remove('is-open')
})

// hide the bar on the way down, bring it back on the way up
let lastY = window.scrollY
addEventListener('scroll', () => {
  const y = window.scrollY
  if (!menu?.classList.contains('is-open')) {
    nav?.classList.toggle('is-hidden', y > lastY && y > 220)
  }
  nav?.classList.toggle('is-scrolled', y > 30)
  lastY = y
}, { passive: true })

/* Mark the section currently in view. rootMargin biases the trigger toward
   the upper third so the highlight changes when a section actually reads
   as the one you are looking at. */
const navLinks = $$('#nav-menu a')
const spy = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue
    const id = `#${entry.target.id}`
    navLinks.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === id)))
  }
}, { rootMargin: '-30% 0px -60% 0px' })
$$('section[id], footer[id]').forEach((s) => spy.observe(s))

/* --------------------------------------------------------------------------
   Reveal on scroll
   -------------------------------------------------------------------------- */
const revealer = new IntersectionObserver((entries, obs) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue
    entry.target.classList.add('is-in')
    obs.unobserve(entry.target)
  }
}, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 })
$$('.reveal').forEach((el) => revealer.observe(el))

/* --------------------------------------------------------------------------
   3D scenes
   Every scene is lazy imported, so three.js never blocks first paint, and
   nothing renders while it is off screen, on the hidden face of the card, or
   in a background tab.
   -------------------------------------------------------------------------- */
function lazyScene({ host, canvas, labels, load, init }) {
  let scene = null
  let failed = false

  return {
    host,
    async ensure() {
      if (scene || failed) return scene
      try {
        const mod = await load()
        scene = init(mod, canvas, labels)
      } catch (err) {
        scene = null
      }
      if (!scene) { failed = true; host?.classList.add('no-webgl'); return null }

      themeListeners.add(() => scene.refreshTheme())
      new ResizeObserver(() => {
        scene.resize()
        if (reduced) scene.renderOnce()
      }).observe(canvas)
      if (reduced) scene.renderOnce()
      if (import.meta.env.DEV && host) host.__scene = scene   // dev handle for stepping frames by hand
      return scene
    },
    start() { if (scene && !reduced) scene.start() },
    stop() { if (scene) scene.stop() },
  }
}

/* --- the hero card, two demos on two faces ------------------------------- */
const stage = $('#stage')
const flipBtn = $('#stage-flip')
const flipLabel = $('.stage-flip-label')

const NAMES = ['Hive-Nav', 'Agri-JEPA']
const faces = [
  lazyScene({
    host: $('#wing-stage'), canvas: $('#wing-canvas'), labels: $('#wing-labels'),
    load: () => import('./wing.js'),
    init: (mod, canvas, labels) => mod.createWing(canvas, labels, {
      onPick: (section) => $(section)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }),
    }),
  }),
  lazyScene({
    host: $('#grow-stage'), canvas: $('#grow-canvas'), labels: $('#grow-labels'),
    load: () => import('./grow.js'),
    init: (mod, canvas, labels) => mod.createGrow(canvas, labels),
  }),
]

let active = 0
let hovering = false
let onScreen = false
const clock = createFlipClock()

function syncFaces() {
  faces.forEach((face, i) => {
    const live = i === active && onScreen && !document.hidden
    // the hidden face is inert, so its room buttons leave the tab order
    face.host?.toggleAttribute('inert', i !== active)
    if (live) face.ensure().then(() => { if (i === active) face.start() })
    else face.stop()
  })
}

function flip() {
  active = active === 0 ? 1 : 0
  clock.reset()
  stage?.classList.toggle('is-flipped', active === 1)
  const next = NAMES[active === 0 ? 1 : 0]
  if (flipLabel) flipLabel.textContent = next
  flipBtn?.setAttribute('aria-label', `Show the ${next} demo`)
  faces[active].ensure()          // warm it while the card is still turning
  syncFaces()
}

flipBtn?.addEventListener('click', flip)

if (stage) {
  // Hovering holds the current face. So does keyboard focus inside it.
  const hold = () => { hovering = true }
  const release = () => { hovering = false }
  stage.addEventListener('pointerenter', hold)
  stage.addEventListener('pointerleave', release)
  stage.addEventListener('focusin', hold)
  stage.addEventListener('focusout', release)

  new IntersectionObserver((entries) => {
    onScreen = entries[0].isIntersecting
    syncFaces()
  }, { rootMargin: '200px' }).observe(stage)

  document.addEventListener('visibilitychange', syncFaces)

  if (!reduced) {
    setInterval(() => {
      const due = clock.tick(TICK_MS, {
        active: onScreen && !document.hidden,
        hovering,
      })
      stage.style.setProperty('--flip-progress', clock.progress.toFixed(3))
      stage.classList.toggle('is-held', hovering)
      if (due) flip()
    }, TICK_MS)
  }
}

/* --- the crop survey beside the publication ------------------------------ */
const cropStage = $('#crop-stage')
if (cropStage) {
  const crop = lazyScene({
    host: cropStage, canvas: $('#crop-canvas'), labels: null,
    load: () => import('./crop.js'),
    init: (mod, canvas) => mod.createCrop(canvas),
  })
  let cropVisible = false
  const cropSync = () => {
    if (cropVisible && !document.hidden) crop.ensure().then(() => crop.start())
    else crop.stop()
  }
  new IntersectionObserver((entries) => {
    cropVisible = entries[0].isIntersecting
    cropSync()
  }, { rootMargin: '200px' }).observe($('#crop-canvas'))
  document.addEventListener('visibilitychange', cropSync)
}

/* --------------------------------------------------------------------------
   Stage affordance
   -------------------------------------------------------------------------- */
const wingFace = $('#wing-stage')
wingFace?.addEventListener('pointerdown', () => {
  wingFace.classList.add('is-touched', 'is-grabbing')
})
addEventListener('pointerup', () => wingFace?.classList.remove('is-grabbing'))

/* --------------------------------------------------------------------------
   Citation counts
   Semantic Scholar first, Crossref as fallback. data-manual-count is a floor,
   because Google Scholar picks up citations before the open APIs do. The
   badge stays hidden unless a count actually resolves.
   -------------------------------------------------------------------------- */
async function citationCount(doi) {
  try {
    const res = await fetch(`https://api.semanticscholar.org/graph/v1/paper/DOI:${doi}?fields=citationCount`)
    if (res.ok) {
      const data = await res.json()
      if (typeof data?.citationCount === 'number') return data.citationCount
    }
  } catch {}
  try {
    const res = await fetch(`https://api.crossref.org/works/${doi}`)
    if (res.ok) {
      const data = await res.json()
      const n = data?.message?.['is-referenced-by-count']
      if (typeof n === 'number') return n
    }
  } catch {}
  return null
}

$$('.pub-citations').forEach(async (el) => {
  const doi = el.dataset.doi
  if (!doi) return
  const manual = parseInt(el.dataset.manualCount || '0', 10)
  const fetched = await citationCount(doi)
  const count = Math.max(manual, fetched ?? 0)
  if (count <= 0) return
  el.querySelector('.citation-count').textContent =
    `${count} ${count === 1 ? 'citation' : 'citations'}`
  el.hidden = false
})

/* --------------------------------------------------------------------------
   Footer year
   -------------------------------------------------------------------------- */
const year = $('#year')
if (year) year.textContent = new Date().getFullYear()
