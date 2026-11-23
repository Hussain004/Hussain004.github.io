/* ==========================================================================
   Ball and wall. A toy restaging of the DL4STG world. A ball goes behind a
   wall, and at the centre it continues with probability 1 - p or turns back
   with probability p. A model that predicts the frame after the ball
   reappears faces two kinds of error. Ambiguity is the spread between the
   two futures and no model can remove it. Memory failure is what a model
   loses by forgetting a cue that would have removed the spread. The cue
   flash shows the choice (yellow for continue, blue for turn back).
   The maths lives in futureWeights so a headless test can check it.
   ========================================================================== */

export const P_LEVELS = [0, 0.25, 0.5]

/* Probability mass on each exit side, given what the observer has seen. */
export function futureWeights(p, cueSeen, outcome) {
  if (cueSeen) return outcome === 'back' ? { cont: 0, back: 1 } : { cont: 1, back: 0 }
  return { cont: 1 - p, back: p }
}

/* Relative ambiguity A. The exit side is a Bernoulli variable, so the
   spread of the two futures scales with p(1 - p). Normalised to 1 at p = 0.5
   and 0 once a cue has resolved the branch. */
export function ambiguity(p, cueSeen) {
  return cueSeen ? 0 : 4 * p * (1 - p)
}

// seconds spent in each phase of one loop
const T_APPROACH = 1.6
const T_HIDDEN = 2.6
const T_CUE_AT = 1.1          // into the hidden phase
const T_EMERGE = 1.4
const T_REST = 0.9
const T_TOTAL = T_APPROACH + T_HIDDEN + T_EMERGE + T_REST

export function createBallWall(canvas, opts = {}) {
  const root = opts.root || canvas.parentElement
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  let p = 0.5
  let cueOn = true
  let outcome = 'back'
  let t = T_APPROACH + 0.6      // first still frame sits inside the hidden phase
  let raf = 0
  let last = 0
  let colours = readColours()

  const pButtons = [...root.querySelectorAll('[data-p]')]
  const cueBox = root.querySelector('[data-cue]')
  const readout = root.querySelector('[data-readout]')
  const bar = root.querySelector('[data-bar]')

  function readColours() {
    const cs = getComputedStyle(document.documentElement)
    const v = (n) => cs.getPropertyValue(n).trim()
    return {
      bg: v('--paper-sunk'), wall: v('--rule-strong'), ink: v('--ink'),
      text: v('--ink-3'), ball: v('--clay'), cont: v('--amber'), back: v('--peri'),
    }
  }

  function rollOutcome() { outcome = Math.random() < p ? 'back' : 'cont' }

  function setP(next) {
    p = next
    pButtons.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.p) === p)))
    rollOutcome()
    paint()
  }
  function setCue(on) { cueOn = on; paint() }

  pButtons.forEach((b) => b.addEventListener('click', () => setP(Number(b.dataset.p))))
  cueBox?.addEventListener('change', () => setCue(cueBox.checked))
  pButtons.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.p) === p)))

  let w = 1, h = 1
  function resize() {
    w = canvas.clientWidth || 1
    h = canvas.clientHeight || 1
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    paint()
  }

  function paint() {
    const c = colours
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = c.bg
    ctx.fillRect(0, 0, w, h)

    const cx = w / 2, cy = h * 0.58
    const wallW = w * 0.24
    const r = Math.min(w, h) * 0.07
    const xL = w * 0.1, xR = w * 0.9

    // wall
    ctx.fillStyle = c.wall
    ctx.fillRect(cx - wallW / 2, 0, wallW, h)
    ctx.fillStyle = c.text
    ctx.font = `600 ${Math.max(10, w * 0.024)}px ui-monospace, monospace`
    ctx.textAlign = 'center'
    ctx.fillText('WALL', cx, h * 0.1)

    const hiddenStart = T_APPROACH
    const emergeStart = T_APPROACH + T_HIDDEN
    const inHidden = t >= hiddenStart && t < emergeStart
    const cueAt = hiddenStart + T_CUE_AT
    const cueSeen = cueOn && t >= cueAt
    const wts = futureWeights(p, cueSeen, outcome)

    // two possible futures, drawn as ghosts while the ball is hidden
    if (inHidden) {
      ghost(xL + r * 1.5, cy, r, c.back, wts.back, 'turns back')
      ghost(xR - r * 1.5, cy, r, c.cont, wts.cont, 'continues')
    }

    // the cue light, top left, held for a moment
    if (cueOn && t >= cueAt && t < cueAt + 0.5) {
      ctx.fillStyle = outcome === 'back' ? c.back : c.cont
      ctx.beginPath()
      ctx.arc(w * 0.08, h * 0.12, r * 0.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // the ball itself
    let bx = null
    if (t < hiddenStart) {
      bx = xL + (cx - wallW / 2 - r - xL) * (t / T_APPROACH)
    } else if (t >= emergeStart && t < emergeStart + T_EMERGE) {
      const k = (t - emergeStart) / T_EMERGE
      bx = outcome === 'back'
        ? cx - wallW / 2 - r - (cx - wallW / 2 - r - (xL + r * 1.5)) * k
        : cx + wallW / 2 + r + (xR - r * 1.5 - (cx + wallW / 2 + r)) * k
    } else if (t >= emergeStart + T_EMERGE) {
      bx = outcome === 'back' ? xL + r * 1.5 : xR - r * 1.5
    }
    if (bx !== null) {
      ctx.fillStyle = c.ball
      ctx.beginPath()
      ctx.arc(bx, cy, r, 0, Math.PI * 2)
      ctx.fill()
    }

    const A = ambiguity(p, cueSeen)
    if (bar) bar.style.setProperty('--a', A.toFixed(2))
    if (readout) {
      readout.textContent = inHidden
        ? (cueSeen ? 'Cue seen. Ambiguity is zero, so any error left is memory failure.'
          : p === 0 ? 'The ball always continues. Ambiguity is zero.'
            : 'Two futures remain. The spread between them is ambiguity, and no model can remove it.')
        : 'Hidden frames are where a predictor has to remember.'
    }
  }

  function ghost(x, y, r, colour, weight, label) {
    ctx.save()
    ctx.globalAlpha = 0.12 + 0.8 * weight
    ctx.setLineDash([5, 4])
    ctx.lineWidth = 2
    ctx.strokeStyle = colour
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 0.9
    ctx.fillStyle = colours.ink
    ctx.font = `500 ${Math.max(10, w * 0.026)}px ui-monospace, monospace`
    ctx.textAlign = 'center'
    ctx.fillText(`${label} ${Math.round(weight * 100)}%`, x, y + r + 18)
    ctx.restore()
  }

  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0
    last = now
    t += dt
    if (t >= T_TOTAL) { t = 0; rollOutcome() }
    paint()
    raf = requestAnimationFrame(frame)
  }

  return {
    resize,
    renderOnce: paint,
    start() { if (!raf) { last = 0; raf = requestAnimationFrame(frame) } },
    stop() { cancelAnimationFrame(raf); raf = 0 },
    refreshTheme() { colours = readColours(); paint() },
    setP, setCue,
  }
}
