<script setup lang="ts">
/**
 * Fluid Background Effect - Canvas 2D Implementation
 * Lightweight, transparent fluid simulation
 */
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  colors?: string[]
}>(), {
  colors: () => ['#4F46E5', '#818CF8', '#F97316']
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let animationId: number | null = null
let particles: Particle[] = []
let mouse = { x: 0, y: 0, px: 0, py: 0 }
let width = 0
let height = 0

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function createParticle(x: number, y: number, vx: number, vy: number): Particle {
  return {
    x,
    y,
    vx: vx * (0.5 + Math.random() * 0.5),
    vy: vy * (0.5 + Math.random() * 0.5),
    life: 0,
    maxLife: 60 + Math.random() * 60,
    color: props.colors[Math.floor(Math.random() * props.colors.length)],
    size: 20 + Math.random() * 40
  }
}

function init() {
  const canvas = canvasRef.value
  if (!canvas) return

  ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return

  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('touchmove', onTouchMove, { passive: true })

  // Start with some ambient particles
  for (let i = 0; i < 5; i++) {
    spawnAmbientParticle()
  }

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
  mouse.px = mouse.x
  mouse.py = mouse.y
  mouse.x = e.clientX
  mouse.y = e.clientY

  const dx = mouse.x - mouse.px
  const dy = mouse.y - mouse.py
  const speed = Math.sqrt(dx * dx + dy * dy)

  if (speed > 2) {
    const count = Math.min(Math.floor(speed / 5), 5)
    for (let i = 0; i < count; i++) {
      particles.push(createParticle(
        mouse.x + (Math.random() - 0.5) * 20,
        mouse.y + (Math.random() - 0.5) * 20,
        dx * 0.3,
        dy * 0.3
      ))
    }
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length > 0) {
    const touch = e.touches[0]
    onMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent)
  }
}

let ambientTime = 0
function spawnAmbientParticle() {
  ambientTime += 0.02
  const x = width * (0.3 + Math.sin(ambientTime * 0.7) * 0.4)
  const y = height * (0.3 + Math.cos(ambientTime * 0.5) * 0.4)
  const vx = Math.cos(ambientTime) * 2
  const vy = Math.sin(ambientTime * 0.8) * 2
  particles.push(createParticle(x, y, vx, vy))
}

function update() {
  // Spawn ambient particles occasionally
  if (Math.random() < 0.05) {
    spawnAmbientParticle()
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.life++
    p.x += p.vx
    p.y += p.vy
    p.vx *= 0.98
    p.vy *= 0.98

    // Remove dead particles
    if (p.life > p.maxLife) {
      particles.splice(i, 1)
    }
  }

  // Limit particles
  while (particles.length > 100) {
    particles.shift()
  }
}

function draw() {
  if (!ctx) return

  // Clear with transparency
  ctx.clearRect(0, 0, width, height)

  // Draw particles with glow
  for (const p of particles) {
    const progress = p.life / p.maxLife
    const alpha = Math.sin(progress * Math.PI) * 0.6
    const size = p.size * (1 - progress * 0.3)

    // Outer glow
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size)
    gradient.addColorStop(0, hexToRgba(p.color, alpha * 0.8))
    gradient.addColorStop(0.4, hexToRgba(p.color, alpha * 0.4))
    gradient.addColorStop(1, hexToRgba(p.color, 0))

    ctx.beginPath()
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()
  }
}

function loop() {
  update()
  draw()
  animationId = requestAnimationFrame(loop)
}

function cleanup() {
  if (animationId) cancelAnimationFrame(animationId)
  window.removeEventListener('resize', resize)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('touchmove', onTouchMove)
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    init()
  }
})

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="liquid-background"
    aria-hidden="true"
  />
</template>

<style scoped>
.liquid-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 1;
}

@media (prefers-reduced-motion: reduce) {
  .liquid-background {
    display: none;
  }
}
</style>
