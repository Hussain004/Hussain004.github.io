import './style.css'

// ============================================
// DOT GRID — Canvas-based animated point cloud
// ============================================
function initDotGrid() {
  const canvas = document.getElementById('hero-canvas')
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  let width, height, dots, mouse, animationId

  mouse = { x: -1000, y: -1000 }

  function resize() {
    width = canvas.width = window.innerWidth
    height = canvas.height = window.innerHeight
    createDots()
  }

  function createDots() {
    dots = []
    const spacing = 50
    const cols = Math.ceil(width / spacing) + 1
    const rows = Math.ceil(height / spacing) + 1

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        dots.push({
          x: i * spacing,
          y: j * spacing,
          baseX: i * spacing,
          baseY: j * spacing,
          vx: 0,
          vy: 0,
          radius: Math.random() * 1.5 + 0.5,
        })
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, width, height)

    const mouseRadius = 150
    const time = Date.now() * 0.001

    dots.forEach((dot, i) => {
      // Gentle ambient drift
      dot.x = dot.baseX + Math.sin(time * 0.5 + i * 0.1) * 3
      dot.y = dot.baseY + Math.cos(time * 0.3 + i * 0.15) * 3

      // Mouse interaction — repel
      const dx = dot.x - mouse.x
      const dy = dot.y - mouse.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < mouseRadius) {
        const force = (1 - dist / mouseRadius) * 20
        dot.x += (dx / dist) * force
        dot.y += (dy / dist) * force
      }

      // Draw dot
      const alpha = 0.15 + (dist < mouseRadius ? (1 - dist / mouseRadius) * 0.4 : 0)
      ctx.beginPath()
      ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(230, 57, 70, ${alpha})`
      ctx.fill()
    })

    // Draw connections
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const dx = dots[i].x - dots[j].x
        const dy = dots[i].y - dots[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 70) {
          ctx.beginPath()
          ctx.moveTo(dots[i].x, dots[i].y)
          ctx.lineTo(dots[j].x, dots[j].y)
          ctx.strokeStyle = `rgba(230, 57, 70, ${0.05 * (1 - dist / 70)})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
    }

    animationId = requestAnimationFrame(animate)
  }

  canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX
    mouse.y = e.clientY
  })

  canvas.addEventListener('mouseleave', () => {
    mouse.x = -1000
    mouse.y = -1000
  })

  window.addEventListener('resize', resize)
  resize()
  animate()

  return () => {
    cancelAnimationFrame(animationId)
    window.removeEventListener('resize', resize)
  }
}

// ============================================
// TYPEWRITER EFFECT
// ============================================
function initTypewriter() {
  const el = document.getElementById('typewriter')
  if (!el) return

  const phrases = [
    'Computer Vision',
    'Robotics',
    'Precision Agriculture',
    'Applied ML',
    'Vision-Language Models',
  ]

  let phraseIndex = 0
  let charIndex = 0
  let isDeleting = false
  let timeout

  function type() {
    const current = phrases[phraseIndex]

    if (isDeleting) {
      charIndex--
      el.textContent = current.substring(0, charIndex)
    } else {
      charIndex++
      el.textContent = current.substring(0, charIndex)
    }

    let speed = isDeleting ? 40 : 80

    if (!isDeleting && charIndex === current.length) {
      speed = 2000 // pause at end
      isDeleting = true
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false
      phraseIndex = (phraseIndex + 1) % phrases.length
      speed = 400 // pause before next word
    }

    timeout = setTimeout(type, speed)
  }

  // Start after hero animations
  setTimeout(type, 1200)

  return () => clearTimeout(timeout)
}

// ============================================
// NAVIGATION
// ============================================
function initNav() {
  const nav = document.getElementById('main-nav')
  const toggle = document.getElementById('nav-toggle')
  const links = document.getElementById('nav-links')

  if (!nav) return

  // Scroll effect
  let lastScroll = 0
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY
    if (scrollY > 50) {
      nav.classList.add('scrolled')
    } else {
      nav.classList.remove('scrolled')
    }
    lastScroll = scrollY
  })

  // Mobile toggle
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active')
      links.classList.toggle('open')
    })

    // Close on link click
    links.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('active')
        links.classList.remove('open')
      })
    })
  }

  // Active section tracking
  const sections = document.querySelectorAll('section[id]')
  const navLinks = document.querySelectorAll('.nav-links a')

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.remove('active')
          if (link.getAttribute('href') === `#${entry.target.id}`) {
            link.classList.add('active')
          }
        })
      }
    })
  }, { threshold: 0.3 })

  sections.forEach(section => observer.observe(section))
}

// ============================================
// SCROLL REVEAL ANIMATION
// ============================================
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal')

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible')
        observer.unobserve(entry.target)
      }
    })
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  })

  reveals.forEach(el => observer.observe(el))
}

// ============================================
// SMOOTH SCROLL
// ============================================
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault()
      const target = document.querySelector(anchor.getAttribute('href'))
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }
    })
  })
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initDotGrid()
  initTypewriter()
  initNav()
  initScrollReveal()
  initSmoothScroll()
})
