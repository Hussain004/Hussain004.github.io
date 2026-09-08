/* ==========================================================================
   Pointer orbit for the hero scenes. Drag turns the model, and with no
   button held the pointer nudges it a fraction of the drag range so the
   scene feels live without fighting the person using it.

   Shared, because the wing and the plant want identical handling and two
   copies of drag maths is two places for it to drift.
   ========================================================================== */
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)

export function createOrbit(el, {
  parallaxYaw = 0.42,      // how far the idle pointer swings the scene
  parallaxTilt = 0.18,
  dragYaw = 0.006,         // radians per pixel dragged
  dragTilt = 0.003,
  tiltMin = -0.25,
  tiltMax = 0.30,
  tapSlop = 6,             // px of travel still counted as a tap, not a drag
  onTap = null,
  onHover = null,
  onEngage = null,         // fires the first time the person touches it
} = {}) {
  let yaw = 0, tilt = 0, yawTarget = 0, tiltTarget = 0
  let dragging = false, lastX = 0, lastY = 0, moved = 0
  let engaged = false

  function down(e) {
    dragging = true
    moved = 0
    lastX = e.clientX
    lastY = e.clientY
    if (!engaged) { engaged = true; onEngage?.() }
    el.setPointerCapture?.(e.pointerId)
  }

  function move(e) {
    const rect = el.getBoundingClientRect()
    if (dragging) {
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      moved += Math.abs(dx) + Math.abs(dy)
      yawTarget += dx * dragYaw
      tiltTarget = clamp(tiltTarget + dy * dragTilt, tiltMin, tiltMax)
      lastX = e.clientX
      lastY = e.clientY
      return
    }
    yawTarget = ((e.clientX - rect.left) / rect.width - 0.5) * parallaxYaw
    tiltTarget = ((e.clientY - rect.top) / rect.height - 0.5) * parallaxTilt
    onHover?.(e, rect)
  }

  function up(e) {
    // a drag that barely moved was meant as a click on whatever is under it
    if (dragging && moved < tapSlop) onTap?.(e, el.getBoundingClientRect())
    dragging = false
    el.releasePointerCapture?.(e.pointerId)
  }

  function leave() {
    dragging = false
    yawTarget = 0
    tiltTarget = 0
    onHover?.(null, null)
  }

  el.addEventListener('pointerdown', down)
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up)
  el.addEventListener('pointerleave', leave)

  return {
    get yaw() { return yaw },
    get tilt() { return tilt },
    get engaged() { return engaged },
    get dragging() { return dragging },
    update(dt) {
      const k = Math.min(1, dt * 4)
      yaw += (yawTarget - yaw) * k
      tilt += (tiltTarget - tilt) * k
    },
    reset() { yaw = tilt = yawTarget = tiltTarget = 0 },
    dispose() {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointerleave', leave)
    },
  }
}
