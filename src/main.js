import './style.css'

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
   Both are lazy imported, so three.js never blocks first paint, and both
   are paused whenever they are off screen or the tab is hidden.
   -------------------------------------------------------------------------- */
function mountScene({ host, canvas, load, init }) {
  if (!canvas) return
  let scene = null
  let visible = false

  const sync = () => {
    if (!scene) return
    if (visible && !document.hidden && !reduced) scene.start()
    else scene.stop()
  }

  const io = new IntersectionObserver(async (entries) => {
    visible = entries[0].isIntersecting
    if (visible && !scene) {
      io.unobserve(canvas)
      try {
        const mod = await load()
        scene = init(mod, canvas)
      } catch (err) {
        host?.classList.add('no-webgl')
        return
      }
      if (!scene) { host?.classList.add('no-webgl'); return }
      if (import.meta.env.DEV && host) host.__scene = scene   // dev handle for stepping frames by hand

      themeListeners.add(() => scene.refreshTheme())
      new ResizeObserver(() => {
        scene.resize()
        if (reduced) scene.renderOnce()
      }).observe(canvas)

      if (reduced) { scene.renderOnce(); return }
      io.observe(canvas)
    }
    sync()
  }, { rootMargin: '200px' })

  io.observe(canvas)
  document.addEventListener('visibilitychange', sync)
}

mountScene({
  host: $('#wing-stage'),
  canvas: $('#wing-canvas'),
  load: () => import('./wing.js'),
  init: (mod, canvas) => mod.createWing(canvas, $('#wing-labels'), {
    onPick: (section) => $(section)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }),
  }),
})

mountScene({
  host: $('#crop-stage'),
  canvas: $('#crop-canvas'),
  load: () => import('./crop.js'),
  init: (mod, canvas) => mod.createCrop(canvas),
})

/* --------------------------------------------------------------------------
   Stage affordance
   -------------------------------------------------------------------------- */
const stage = $('#wing-stage')
stage?.addEventListener('pointerdown', () => {
  stage.classList.add('is-touched', 'is-grabbing')
})
addEventListener('pointerup', () => stage?.classList.remove('is-grabbing'))

/* --------------------------------------------------------------------------
   Footer year
   -------------------------------------------------------------------------- */
const year = $('#year')
if (year) year.textContent = new Date().getFullYear()
