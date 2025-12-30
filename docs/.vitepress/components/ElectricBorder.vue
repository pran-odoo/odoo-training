<script setup lang="ts">
// CREDIT: Component inspired by @BalintFerenczy on X
// https://codepen.io/BalintFerenczy/pen/KwdoyEN

import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  color?: string
  speed?: number
  chaos?: number
  borderRadius?: number
}

const props = withDefaults(defineProps<Props>(), {
  color: '#7df9ff',
  speed: 1,
  chaos: 0.12,
  borderRadius: 24
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const isHovered = ref(false)

let animationId: number | null = null
let time = 0
let lastFrameTime = 0
let ctx: CanvasRenderingContext2D | null = null
let width = 0
let height = 0
let resizeObserver: ResizeObserver | null = null

const borderOffset = 60

function hexToRgba(hex: string, alpha: number = 1): string {
  if (!hex) return `rgba(0,0,0,${alpha})`
  let h = hex.replace('#', '')
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('')
  }
  const int = parseInt(h, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function random(x: number): number {
  return (Math.sin(x * 12.9898) * 43758.5453) % 1
}

function noise2D(x: number, y: number): number {
  const i = Math.floor(x)
  const j = Math.floor(y)
  const fx = x - i
  const fy = y - j

  const a = random(i + j * 57)
  const b = random(i + 1 + j * 57)
  const c = random(i + (j + 1) * 57)
  const d = random(i + 1 + (j + 1) * 57)

  const ux = fx * fx * (3.0 - 2.0 * fx)
  const uy = fy * fy * (3.0 - 2.0 * fy)

  return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy
}

function octavedNoise(
  x: number,
  octaves: number,
  lacunarity: number,
  gain: number,
  baseAmplitude: number,
  baseFrequency: number,
  time: number,
  seed: number,
  baseFlatness: number
): number {
  let y = 0
  let amplitude = baseAmplitude
  let frequency = baseFrequency

  for (let i = 0; i < octaves; i++) {
    let octaveAmplitude = amplitude
    if (i === 0) {
      octaveAmplitude *= baseFlatness
    }
    y += octaveAmplitude * noise2D(frequency * x + seed * 100, time * frequency * 0.3)
    frequency *= lacunarity
    amplitude *= gain
  }

  return y
}

function getCornerPoint(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  arcLength: number,
  progress: number
): { x: number; y: number } {
  const angle = startAngle + progress * arcLength
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle)
  }
}

function getRoundedRectPoint(
  t: number,
  left: number,
  top: number,
  width: number,
  height: number,
  radius: number
): { x: number; y: number } {
  const straightWidth = width - 2 * radius
  const straightHeight = height - 2 * radius
  const cornerArc = (Math.PI * radius) / 2
  const totalPerimeter = 2 * straightWidth + 2 * straightHeight + 4 * cornerArc
  const distance = t * totalPerimeter

  let accumulated = 0

  if (distance <= accumulated + straightWidth) {
    const progress = (distance - accumulated) / straightWidth
    return { x: left + radius + progress * straightWidth, y: top }
  }
  accumulated += straightWidth

  if (distance <= accumulated + cornerArc) {
    const progress = (distance - accumulated) / cornerArc
    return getCornerPoint(left + width - radius, top + radius, radius, -Math.PI / 2, Math.PI / 2, progress)
  }
  accumulated += cornerArc

  if (distance <= accumulated + straightHeight) {
    const progress = (distance - accumulated) / straightHeight
    return { x: left + width, y: top + radius + progress * straightHeight }
  }
  accumulated += straightHeight

  if (distance <= accumulated + cornerArc) {
    const progress = (distance - accumulated) / cornerArc
    return getCornerPoint(left + width - radius, top + height - radius, radius, 0, Math.PI / 2, progress)
  }
  accumulated += cornerArc

  if (distance <= accumulated + straightWidth) {
    const progress = (distance - accumulated) / straightWidth
    return { x: left + width - radius - progress * straightWidth, y: top + height }
  }
  accumulated += straightWidth

  if (distance <= accumulated + cornerArc) {
    const progress = (distance - accumulated) / cornerArc
    return getCornerPoint(left + radius, top + height - radius, radius, Math.PI / 2, Math.PI / 2, progress)
  }
  accumulated += cornerArc

  if (distance <= accumulated + straightHeight) {
    const progress = (distance - accumulated) / straightHeight
    return { x: left, y: top + height - radius - progress * straightHeight }
  }
  accumulated += straightHeight

  const progress = (distance - accumulated) / cornerArc
  return getCornerPoint(left + radius, top + radius, radius, Math.PI, Math.PI / 2, progress)
}

function updateSize() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container || !ctx) return

  const rect = container.getBoundingClientRect()
  width = rect.width + borderOffset * 2
  height = rect.height + borderOffset * 2

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(dpr, dpr)
}

function drawElectricBorder(currentTime: number) {
  const canvas = canvasRef.value
  if (!canvas || !ctx || !isHovered.value) {
    animationId = null
    return
  }

  const octaves = 10
  const lacunarity = 1.6
  const gain = 0.7
  const amplitude = props.chaos
  const frequency = 10
  const baseFlatness = 0
  const displacement = 60

  const deltaTime = (currentTime - lastFrameTime) / 1000
  time += deltaTime * props.speed
  lastFrameTime = currentTime

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(dpr, dpr)

  ctx.strokeStyle = props.color
  ctx.lineWidth = 1
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const scale = displacement
  const left = borderOffset
  const top = borderOffset
  const borderWidth = width - 2 * borderOffset
  const borderHeight = height - 2 * borderOffset
  const maxRadius = Math.min(borderWidth, borderHeight) / 2
  const radius = Math.min(props.borderRadius, maxRadius)

  const approximatePerimeter = 2 * (borderWidth + borderHeight) + 2 * Math.PI * radius
  const sampleCount = Math.floor(approximatePerimeter / 2)

  ctx.beginPath()

  for (let i = 0; i <= sampleCount; i++) {
    const progress = i / sampleCount

    const point = getRoundedRectPoint(progress, left, top, borderWidth, borderHeight, radius)

    const xNoise = octavedNoise(
      progress * 8,
      octaves,
      lacunarity,
      gain,
      amplitude,
      frequency,
      time,
      0,
      baseFlatness
    )
    const yNoise = octavedNoise(
      progress * 8,
      octaves,
      lacunarity,
      gain,
      amplitude,
      frequency,
      time,
      1,
      baseFlatness
    )

    const displacedX = point.x + xNoise * scale
    const displacedY = point.y + yNoise * scale

    if (i === 0) {
      ctx.moveTo(displacedX, displacedY)
    } else {
      ctx.lineTo(displacedX, displacedY)
    }
  }

  ctx.closePath()
  ctx.stroke()

  animationId = requestAnimationFrame(drawElectricBorder)
}

function startAnimation() {
  if (animationId) return
  lastFrameTime = performance.now()
  animationId = requestAnimationFrame(drawElectricBorder)
}

function stopAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  // Clear the canvas
  const canvas = canvasRef.value
  if (canvas && ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
}

function handleMouseEnter() {
  isHovered.value = true
  startAnimation()
}

function handleMouseLeave() {
  isHovered.value = false
  stopAnimation()
}

onMounted(() => {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  ctx = canvas.getContext('2d')
  if (!ctx) return

  updateSize()

  resizeObserver = new ResizeObserver(updateSize)
  resizeObserver.observe(container)
})

onUnmounted(() => {
  stopAnimation()
  resizeObserver?.disconnect()
})
</script>

<template>
  <div
    ref="containerRef"
    class="electric-border-container"
    :class="{ 'is-hovered': isHovered }"
    :style="{
      '--electric-border-color': color,
      borderRadius: `${borderRadius}px`
    }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="electric-canvas-wrapper">
      <canvas ref="canvasRef" class="electric-canvas" />
    </div>
    <div class="electric-glow-layers">
      <div
        class="glow-layer glow-inner"
        :style="{
          border: `2px solid ${hexToRgba(color, 0.6)}`,
          filter: 'blur(1px)'
        }"
      />
      <div
        class="glow-layer glow-outer"
        :style="{
          border: `2px solid ${color}`,
          filter: 'blur(4px)'
        }"
      />
      <div
        class="glow-layer glow-bg"
        :style="{
          filter: 'blur(32px)',
          background: `linear-gradient(-30deg, ${color}, transparent, ${color})`
        }"
      />
    </div>
    <div class="electric-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.electric-border-container {
  position: relative;
  overflow: visible;
  isolation: isolate;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.electric-border-container:hover {
  transform: translateY(-4px);
}

.electric-canvas-wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.electric-border-container.is-hovered .electric-canvas-wrapper {
  opacity: 1;
}

.electric-canvas {
  display: block;
}

.electric-glow-layers {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.electric-border-container.is-hovered .electric-glow-layers {
  opacity: 1;
}

.glow-layer {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}

.glow-bg {
  z-index: -1;
  transform: scale(1.1);
  opacity: 0.3;
}

.electric-content {
  position: relative;
  border-radius: inherit;
  z-index: 1;
}

/* Static border when not hovered */
.electric-border-container::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid var(--vp-c-divider);
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.electric-border-container.is-hovered::before {
  opacity: 0;
}
</style>
