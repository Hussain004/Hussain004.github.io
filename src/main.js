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
  const meta = $('#theme-color-meta')
  if (meta) meta.content = name === 'dark' ? '#101a15' : '#f5f2e8'
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
   Scenes
   Every scene is lazy imported, so three.js never blocks first paint, and
   nothing renders while it is off screen, in a closed window, or in a
   background tab.
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

/* --- the hero, Hive-Nav restaged ----------------------------------------- */
const stage = $('#stage')
if (stage) {
  const wing = lazyScene({
    host: $('#wing-stage'), canvas: $('#wing-canvas'), labels: $('#wing-labels'),
    load: () => import('./wing.js'),
    init: (mod, canvas, labels) => mod.createWing(canvas, labels, {
      onPick: (section) => $(section)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }),
    }),
  })
  let onScreen = false
  const sync = () => {
    if (onScreen && !document.hidden) wing.ensure().then(() => { if (onScreen) wing.start() })
    else wing.stop()
  }
  new IntersectionObserver((entries) => {
    onScreen = entries[0].isIntersecting
    sync()
  }, { rootMargin: '200px' }).observe(stage)
  document.addEventListener('visibilitychange', sync)
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
$$('.stage-face').forEach((face) => {
  face.addEventListener('pointerdown', () => face.classList.add('is-touched', 'is-grabbing'))
})
addEventListener('pointerup', () => $$('.stage-face').forEach((f) => f.classList.remove('is-grabbing')))

/* --------------------------------------------------------------------------
   Research questions
   Without script every panel shows. With it, the three cards become tabs.
   -------------------------------------------------------------------------- */
const qs = $('#qs')
if (qs) {
  const tabs = $$('.q-tab', qs)
  const panels = $$('.q-panel', qs)
  qs.classList.add('has-js')

  const select = (i, focus = false) => {
    tabs.forEach((tab, j) => {
      tab.setAttribute('aria-selected', String(i === j))
      tab.tabIndex = i === j ? 0 : -1
    })
    panels.forEach((panel, j) => { panel.hidden = i !== j })
    if (focus) tabs[i].focus()
  }

  tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i)))
  qs.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement)
    if (i < 0) return
    const next = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[e.key]
    if (next === undefined) return
    e.preventDefault()
    select(next, true)
  })
  select(0)
}

/* --------------------------------------------------------------------------
   Project windows
   A native dialog gives focus trapping, Escape, and a backdrop for free. A
   window that holds a demo starts it on open and stops it on close, so a
   closed window costs nothing. The hash makes a window linkable.
   -------------------------------------------------------------------------- */
const demos = {
  grow: lazyScene({
    host: $('#grow-stage'), canvas: $('#grow-canvas'), labels: $('#grow-labels'),
    load: () => import('./grow.js'),
    init: (mod, canvas, labels) => mod.createGrow(canvas, labels),
  }),
  ball: lazyScene({
    host: $('#ball-stage'), canvas: $('#ball-canvas'), labels: null,
    load: () => import('./ballwall.js'),
    init: (mod, canvas) => mod.createBallWall(canvas, { root: $('#ball-stage') }),
  }),
}

function openWindow(id) {
  const win = document.getElementById(id)
  if (!win || win.tagName !== 'DIALOG' || win.open) return
  win.showModal()
  $('.win-inner', win).scrollTop = 0
  history.replaceState(null, '', `#${id}`)
  const demo = demos[win.dataset.demo]
  if (demo) demo.ensure().then(() => { if (win.open) demo.start() })
}

$$('dialog.win').forEach((win) => {
  win.addEventListener('close', () => {
    demos[win.dataset.demo]?.stop()
    if (location.hash === `#${win.id}`) history.replaceState(null, '', location.pathname + location.search)
  })
  // the dialog fills its own box, so a click that lands on it is a click on the backdrop
  win.addEventListener('click', (e) => { if (e.target === win) win.close() })
  $('[data-close]', win)?.addEventListener('click', () => win.close())
})

document.addEventListener('click', (e) => {
  const opener = e.target.closest('[data-open]')
  if (!opener) return
  e.preventDefault()
  openWindow(opener.dataset.open)
})
if (location.hash.startsWith('#w-')) openWindow(location.hash.slice(1))

/* Before and after slider in the localization window */
$$('.compare').forEach((box) => {
  const range = $('.compare-range', box)
  const set = () => box.style.setProperty('--pos', `${range.value}%`)
  range.addEventListener('input', set)
  set()
})

/* --------------------------------------------------------------------------
   Citation counts
   Semantic Scholar first, Crossref as fallback. data-manual-count is a floor,
   because Google Scholar picks up citations before the open APIs do. The
   badge stays hidden unless a count actually resolves. Requests are deferred
   until the publication is near the viewport and each has a short deadline,
   so a slow third party never holds up the page.
   -------------------------------------------------------------------------- */
async function citationCount(doi) {
  const get = (url) => new Promise((resolve) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    fetch(url, { signal: controller.signal })
      .then((res) => res.ok ? res.json() : null)
      .then(resolve)
      .catch(() => resolve(null))
      .finally(() => clearTimeout(timer))
  })

  const paper = await get(`https://api.semanticscholar.org/graph/v1/paper/DOI:${doi}?fields=citationCount`)
  if (typeof paper?.citationCount === 'number') return paper.citationCount
  const crossref = await get(`https://api.crossref.org/works/${doi}`)
  const n = crossref?.message?.['is-referenced-by-count']
  return typeof n === 'number' ? n : null
}

async function resolveCitations(el) {
  const doi = el.dataset.doi
  if (!doi) return
  const manual = parseInt(el.dataset.manualCount || '0', 10)
  const fetched = await citationCount(doi)
  const count = Math.max(manual, fetched ?? 0)
  if (count <= 0) return
  el.querySelector('.citation-count').textContent =
    `${count} ${count === 1 ? 'citation' : 'citations'}`
  el.hidden = false
}

const citationBadges = $$('.pub-citations')
if (citationBadges.length && 'IntersectionObserver' in window) {
  // The badge itself is display:none until a count resolves, so watch its
  // visible parent instead.
  const citationObserver = new IntersectionObserver((entries, obs) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      obs.unobserve(entry.target)
      const badge = entry.target.querySelector('.pub-citations')
      if (badge) resolveCitations(badge)
    }
  }, { rootMargin: '200px' })
  citationBadges.forEach((el) => citationObserver.observe(el.parentElement))
} else {
  citationBadges.forEach(resolveCitations)
}

/* --------------------------------------------------------------------------
   Copy BibTeX
   -------------------------------------------------------------------------- */
const bibtexBtn = $('#bibtex-btn')
bibtexBtn?.addEventListener('click', async () => {
  const label = $('#bibtex-label')
  // A <template>'s children live in .content, a separate fragment, so the
  // element's own textContent is always empty.
  const text = $('#bibtex-source')?.content.textContent.trim()
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    label.textContent = 'Copied'
  } catch {
    label.textContent = 'Select and copy manually'
  }
  setTimeout(() => { label.textContent = 'Copy BibTeX' }, 1800)
})

/* --------------------------------------------------------------------------
   Footer year
   -------------------------------------------------------------------------- */
const year = $('#year')
if (year) year.textContent = new Date().getFullYear()

/* --------------------------------------------------------------------------
   Copy the email address for people who cannot open a mail client
   -------------------------------------------------------------------------- */
const copyMail = $('[data-copy-mail]')
if (copyMail) {
  const label = $('span', copyMail)
  let reset = 0
  copyMail.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(copyMail.dataset.copyMail)
      label.textContent = 'Copied'
      copyMail.classList.add('is-copied')
    } catch {
      label.textContent = 'Select and copy manually'
    }
    clearTimeout(reset)
    reset = setTimeout(() => {
      label.textContent = 'Copy address'
      copyMail.classList.remove('is-copied')
    }, 1800)
  })
}

/* --------------------------------------------------------------------------
   Printing: open every fold so the PDF handout carries the full record, then
   put the folds back the way the reader left them.
   -------------------------------------------------------------------------- */
let openFolds = []
addEventListener('beforeprint', () => {
  openFolds = $$('details').filter((d) => d.open)
  $$('details').forEach((d) => { d.open = true })
})
addEventListener('afterprint', () => {
  $$('details').forEach((d) => { d.open = openFolds.includes(d) })
})
