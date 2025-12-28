<script setup lang="ts">
/**
 * Hi-Tech Cursor Effect
 * Orbiting particles, pulsing rings, and crosshairs
 */
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let animationId: number | null = null
let width = 0
let height = 0

// Mouse state
let mouse = { x: -100, y: -100, active: false }
let time = 0

// Particle trails
interface Trail {
  x: number
  y: number
  alpha: number
}
let trails: Trail[] = []

function init() {
  const canvas = canvasRef.value
  if (!canvas) return

  ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return

  resize()
  window.addEventListener('resize', resize)
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseenter', () => mouse.active = true)
  document.addEventListener('mouseleave', () => mouse.active = false)

  loop()
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas) return

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = window.innerWidth
  height = window.innerHeight
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = width + 'px'
  canvas.style.height = height + 'px'
  if (ctx) {
    ctx.scale(dpr, dpr)
  }
}

function onMouseMove(e: MouseEvent) {
  mouse.x = e.clientX
  mouse.y = e.clientY
  mouse.active = true

  // Add trail point
  trails.push({ x: mouse.x, y: mouse.y, alpha: 1 })
  if (trails.length > 20) trails.shift()
}

function draw() {
  if (!ctx || !mouse.active) return

  ctx.clearRect(0, 0, width, height)
  time += 0.03

  const x = mouse.x
  const y = mouse.y

  // Get theme color
  const isDark = document.documentElement.classList.contains('dark')
  const primaryColor = isDark ? '#818CF8' : '#4F46E5'
  const secondaryColor = isDark ? '#F97316' : '#EA580C'
  const glowColor = isDark ? 'rgba(129, 140, 248, 0.3)' : 'rgba(79, 70, 229, 0.3)'

  // Draw trail
  ctx.beginPath()
  for (let i = 0; i < trails.length; i++) {
    const t = trails[i]
    t.alpha *= 0.9
    if (i === 0) {
      ctx.moveTo(t.x, t.y)
    } else {
      ctx.lineTo(t.x, t.y)
    }
  }
  ctx.strokeStyle = glowColor
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.stroke()

  // Outer glow ring
  const glowSize = 35 + Math.sin(time * 2) * 5
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
  gradient.addColorStop(0.5, glowColor)
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.beginPath()
  ctx.arc(x, y, glowSize, 0, Math.PI * 2)
  ctx.fillStyle = gradient
  ctx.fill()

  // Rotating crosshairs
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(time)

  ctx.strokeStyle = primaryColor
  ctx.lineWidth = 1.5
  ctx.globalAlpha = 0.8

  // Crosshair lines
  const crossSize = 18
  const gap = 6

  // Top
  ctx.beginPath()
  ctx.moveTo(0, -gap)
  ctx.lineTo(0, -crossSize)
  ctx.stroke()

  // Bottom
  ctx.beginPath()
  ctx.moveTo(0, gap)
  ctx.lineTo(0, crossSize)
  ctx.stroke()

  // Left
  ctx.beginPath()
  ctx.moveTo(-gap, 0)
  ctx.lineTo(-crossSize, 0)
  ctx.stroke()

  // Right
  ctx.beginPath()
  ctx.moveTo(gap, 0)
  ctx.lineTo(crossSize, 0)
  ctx.stroke()

  ctx.restore()

  // Orbiting particles
  const orbitCount = 5
  const orbitRadius = 25
  for (let i = 0; i < orbitCount; i++) {
    const angle = (time * 2) + (i * Math.PI * 2 / orbitCount)
    const px = x + Math.cos(angle) * orbitRadius
    const py = y + Math.sin(angle) * orbitRadius
    const size = 3 + Math.sin(time * 3 + i) * 1

    // Particle glow
    const pGradient = ctx.createRadialGradient(px, py, 0, px, py, size * 3)
    pGradient.addColorStop(0, secondaryColor)
    pGradient.addColorStop(0.5, `${secondaryColor}66`)
    pGradient.addColorStop(1, 'transparent')

    ctx.beginPath()
    ctx.arc(px, py, size * 3, 0, Math.PI * 2)
    ctx.fillStyle = pGradient
    ctx.fill()

    // Particle core
    ctx.beginPath()
    ctx.arc(px, py, size, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
  }

  // Inner pulsing rings
  for (let i = 0; i < 3; i++) {
    const ringRadius = 8 + i * 6 + Math.sin(time * 3 - i * 0.5) * 2
    const alpha = 0.4 - i * 0.1

    ctx.beginPath()
    ctx.arc(x, y, ringRadius, 0, Math.PI * 2)
    ctx.strokeStyle = primaryColor
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // Center dot
  ctx.beginPath()
  ctx.arc(x, y, 3, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()

  // Clean up old trails
  trails = trails.filter(t => t.alpha > 0.05)
}

function loop() {
  draw()
  animationId = requestAnimationFrame(loop)
}

function cleanup() {
  if (animationId) cancelAnimationFrame(animationId)
  window.removeEventListener('resize', resize)
  document.removeEventListener('mousemove', onMouseMove)
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    // Only enable on desktop
    if (window.matchMedia('(pointer: fine)').matches) {
      init()
    }
  }
})

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="hitech-cursor"
    aria-hidden="true"
  />
</template>

<style scoped>
.hitech-cursor {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
}

@media (pointer: coarse) {
  .hitech-cursor {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hitech-cursor {
    display: none;
  }
}
</style>
