<script setup lang="ts">
/**
 * Galaxy Background Effect - Enhanced WebGL Shader
 * Based on React Bits Galaxy component by @BalintFerenczy
 * https://codepen.io/BalintFerenczy/pen/KwdoyEN
 */
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  density?: number
  speed?: number
  glowIntensity?: number
  twinkleIntensity?: number
  rotationSpeed?: number
  hueShift?: number
  saturation?: number
  mouseInteraction?: boolean
  mouseRepulsion?: boolean
  repulsionStrength?: number
}

const props = withDefaults(defineProps<Props>(), {
  density: 1.5,
  speed: 1.0,
  glowIntensity: 0.3,
  twinkleIntensity: 0.3,
  rotationSpeed: 0.1,
  hueShift: 140,
  saturation: 0.0,
  mouseInteraction: true,
  mouseRepulsion: true,
  repulsionStrength: 2
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const isReady = ref(false)

let gl: WebGLRenderingContext | null = null
let isMobile = false
let isLowEndDevice = false
let isVeryLowEndDevice = false // For truly slow devices - disable entirely
let program: WebGLProgram | null = null
let buffer: WebGLBuffer | null = null
let animationId: number | null = null
let startTime = 0
let isVisible = true
let prefersReducedMotion = false
let shouldAnimate = true
let uniforms: Record<string, WebGLUniformLocation | null> = {}
let lastRenderTime = 0
let effectiveDensity = 1.5 // Will be reduced for low-end devices
let effectiveNumLayers = 4 // Will be reduced for low-end devices
const TARGET_FPS = 20 // Limit to 20fps for ambient background effect
const FRAME_TIME = 1000 / TARGET_FPS

// Idle detection
const IDLE_TIMEOUT = 5000 // 5 seconds for background effect
let lastInputTime = 0
let isIdle = false
let reducedMotionQuery: MediaQueryList | null = null

// Mouse tracking with smoothing
const targetMouse = { x: 0.5, y: 0.5 }
const smoothMouse = { x: 0.5, y: 0.5 }
let mouseActive = 0
let targetMouseActive = 0

const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `
precision mediump float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uFocal;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform bool uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uNumLayers;

varying vec2 vUv;

#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0

float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tri(float x) {
  return abs(fract(x) * 2.0 - 1.0);
}

float tris(float x) {
  float t = fract(x);
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}

float trisn(float x) {
  float t = fract(x);
  return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float Star(vec2 uv, float flare) {
  float d = length(uv);
  float m = (0.05 * uGlowIntensity) / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * flare * uGlowIntensity;
  uv *= MAT45;
  rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * 0.3 * flare * uGlowIntensity;
  m *= smoothstep(1.0, 0.2, d);
  return m;
}

vec3 StarLayer(vec2 uv) {
  vec3 col = vec3(0.0);

  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 si = id + vec2(float(x), float(y));
      float seed = Hash21(si);
      float size = fract(seed * 345.32);
      float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
      float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

      float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
      float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
      float grn = min(red, blu) * seed;
      vec3 base = vec3(red, grn, blu);

      float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
      hue = fract(hue + uHueShift / 360.0);
      float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
      float val = max(max(base.r, base.g), base.b);
      base = hsv2rgb(vec3(hue, sat, val));

      vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0), tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;

      float star = Star(gv - offset - pad, flareSize);
      vec3 color = base;

      float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
      twinkle = mix(1.0, twinkle, uTwinkleIntensity);
      star *= twinkle;

      col += star * size * color;
    }
  }

  return col;
}

void main() {
  vec2 focalPx = uFocal * uResolution;
  vec2 uv = (vUv * uResolution - focalPx) / uResolution.y;

  vec2 mouseNorm = uMouse - vec2(0.5);

  if (uMouseRepulsion) {
    vec2 mousePosUV = (uMouse * uResolution - focalPx) / uResolution.y;
    float mouseDist = length(uv - mousePosUV);
    vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
    uv += repulsion * 0.05 * uMouseActiveFactor;
  } else {
    vec2 mouseOffset = mouseNorm * 0.1 * uMouseActiveFactor;
    uv += mouseOffset;
  }

  float autoRotAngle = uTime * uRotationSpeed;
  mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
  uv = autoRot * uv;

  vec3 col = vec3(0.0);

  float layerStep = 1.0 / uNumLayers;
  for (float i = 0.0; i < 1.0; i += 0.25) {
    if (i >= 1.0 - 0.01) break; // Safety break
    if (i * uNumLayers >= uNumLayers - 0.01) break; // Respect layer count
    float depth = fract(i + uStarSpeed * uSpeed);
    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
    float fade = depth * smoothstep(1.0, 0.9, depth);
    col += StarLayer(uv * scale + i * 453.32) * fade;
  }

  float alpha = length(col);
  alpha = smoothstep(0.0, 0.3, alpha);
  alpha = min(alpha, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`

function createShader(type: number, source: string): WebGLShader | null {
  if (!gl) return null
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Galaxy shader error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function initWebGL(): boolean {
  const canvas = canvasRef.value
  if (!canvas) return false

  gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false,
    powerPreference: 'low-power'
  })

  if (!gl) {
    console.warn('WebGL not supported')
    return false
  }

  const vertShader = createShader(gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragShader = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  if (!vertShader || !fragShader) return false

  program = gl.createProgram()
  if (!program) return false

  gl.attachShader(program, vertShader)
  gl.attachShader(program, fragShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Galaxy program error:', gl.getProgramInfoLog(program))
    return false
  }

  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
  buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

  const posLoc = gl.getAttribLocation(program, 'aPosition')
  gl.enableVertexAttribArray(posLoc)
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

  gl.useProgram(program)
  uniforms = {
    uTime: gl.getUniformLocation(program, 'uTime'),
    uResolution: gl.getUniformLocation(program, 'uResolution'),
    uFocal: gl.getUniformLocation(program, 'uFocal'),
    uStarSpeed: gl.getUniformLocation(program, 'uStarSpeed'),
    uDensity: gl.getUniformLocation(program, 'uDensity'),
    uHueShift: gl.getUniformLocation(program, 'uHueShift'),
    uSpeed: gl.getUniformLocation(program, 'uSpeed'),
    uMouse: gl.getUniformLocation(program, 'uMouse'),
    uGlowIntensity: gl.getUniformLocation(program, 'uGlowIntensity'),
    uSaturation: gl.getUniformLocation(program, 'uSaturation'),
    uMouseRepulsion: gl.getUniformLocation(program, 'uMouseRepulsion'),
    uTwinkleIntensity: gl.getUniformLocation(program, 'uTwinkleIntensity'),
    uRotationSpeed: gl.getUniformLocation(program, 'uRotationSpeed'),
    uRepulsionStrength: gl.getUniformLocation(program, 'uRepulsionStrength'),
    uMouseActiveFactor: gl.getUniformLocation(program, 'uMouseActiveFactor'),
    uNumLayers: gl.getUniformLocation(program, 'uNumLayers')
  }

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  return true
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas || !gl) return

  const width = window.innerWidth
  const height = window.innerHeight

  // Dynamic DPR based on device capability
  // - Low-end devices: render at 0.5x for massive performance boost
  // - Mobile: cap at 0.75x
  // - Medium devices: cap at 1.0
  // - High-end desktop: cap at 1.25
  let maxDpr = 1.25
  if (isLowEndDevice) {
    maxDpr = 0.5 // Half resolution for low-end
  } else if (isMobile) {
    maxDpr = 0.75
  } else if (effectiveNumLayers <= 3) {
    // Medium devices (reduced layers)
    maxDpr = 1.0
  }
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr)

  const displayWidth = Math.floor(width * dpr)
  const displayHeight = Math.floor(height * dpr)

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth
    canvas.height = displayHeight
    gl.viewport(0, 0, displayWidth, displayHeight)
  }
}

function render(timestamp: number = 0) {
  // Stop the loop entirely if WebGL isn't ready or animation should be stopped
  if (!gl || !program) {
    animationId = null
    return
  }

  // Don't animate if hidden, reduced motion, or shouldn't animate - stop loop entirely
  if (!isVisible || prefersReducedMotion || !shouldAnimate) {
    animationId = null
    return
  }

  // Check for idle state - stop loop after IDLE_TIMEOUT of no input
  const timeSinceInput = timestamp - lastInputTime
  if (timeSinceInput > IDLE_TIMEOUT) {
    // Go idle - stop the animation loop entirely
    isIdle = true
    animationId = null
    return
  }

  animationId = requestAnimationFrame(render)

  // Frame rate limiting - skip frame if not enough time has passed
  const elapsed = timestamp - lastRenderTime
  if (elapsed < FRAME_TIME) return
  lastRenderTime = timestamp - (elapsed % FRAME_TIME)

  const time = (performance.now() - startTime) * 0.001

  // Smooth mouse interpolation
  const lerpFactor = 0.05
  smoothMouse.x += (targetMouse.x - smoothMouse.x) * lerpFactor
  smoothMouse.y += (targetMouse.y - smoothMouse.y) * lerpFactor
  mouseActive += (targetMouseActive - mouseActive) * lerpFactor

  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  gl.useProgram(program)

  gl.uniform1f(uniforms.uTime, time)
  gl.uniform2f(uniforms.uResolution, canvasRef.value!.width, canvasRef.value!.height)
  gl.uniform2f(uniforms.uFocal, 0.5, 0.5)
  gl.uniform1f(uniforms.uStarSpeed, time * 0.5 / 10.0)
  gl.uniform1f(uniforms.uDensity, effectiveDensity)
  gl.uniform1f(uniforms.uHueShift, props.hueShift)
  gl.uniform1f(uniforms.uSpeed, props.speed)
  gl.uniform2f(uniforms.uMouse, smoothMouse.x, smoothMouse.y)
  gl.uniform1f(uniforms.uGlowIntensity, props.glowIntensity)
  gl.uniform1f(uniforms.uSaturation, props.saturation)
  gl.uniform1i(uniforms.uMouseRepulsion, props.mouseRepulsion ? 1 : 0)
  gl.uniform1f(uniforms.uTwinkleIntensity, props.twinkleIntensity)
  gl.uniform1f(uniforms.uRotationSpeed, props.rotationSpeed)
  gl.uniform1f(uniforms.uRepulsionStrength, props.repulsionStrength)
  gl.uniform1f(uniforms.uMouseActiveFactor, mouseActive)
  gl.uniform1f(uniforms.uNumLayers, effectiveNumLayers)

  // Draw the stars
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}

// Wake up from idle when user interacts
function wakeFromIdle() {
  lastInputTime = performance.now()
  if (isIdle && animationId === null && shouldAnimate && !prefersReducedMotion) {
    isIdle = false
    render()
  }
}

function handleMouseMove(e: MouseEvent) {
  wakeFromIdle() // Wake up animation on mouse move
  if (!props.mouseInteraction || isMobile) return
  targetMouse.x = e.clientX / window.innerWidth
  targetMouse.y = 1.0 - e.clientY / window.innerHeight
  targetMouseActive = 1.0
}

function handleMouseLeave() {
  targetMouseActive = 0.0
}

function handleTouchMove(e: TouchEvent) {
  wakeFromIdle() // Wake up animation on touch
  if (!props.mouseInteraction || !e.touches.length) return
  const touch = e.touches[0]
  targetMouse.x = touch.clientX / window.innerWidth
  targetMouse.y = 1.0 - touch.clientY / window.innerHeight
  targetMouseActive = 1.0
}

function handleTouchEnd() {
  // Gradually fade out the effect
  targetMouseActive = 0.0
}

function handleVisibilityChange() {
  isVisible = !document.hidden
  // Wake up when becoming visible again - restart the stopped loop
  if (isVisible && shouldAnimate && !prefersReducedMotion && animationId === null) {
    lastInputTime = performance.now() // Reset idle timer
    isIdle = false
    render()
  }
}

function handleReducedMotionChange(e: MediaQueryListEvent) {
  prefersReducedMotion = e.matches
  if (e.matches) {
    // Stop animation loop when reduced motion is enabled
    shouldAnimate = false
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  } else {
    // Resume animation when reduced motion is disabled
    shouldAnimate = true
    if (animationId === null) {
      render()
    }
  }
}

function cleanup() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('resize', resize)
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseleave', handleMouseLeave)
  window.removeEventListener('touchmove', handleTouchMove)
  window.removeEventListener('touchend', handleTouchEnd)

  // Clean up reduced motion listener
  if (reducedMotionQuery) {
    reducedMotionQuery.removeEventListener('change', handleReducedMotionChange)
    reducedMotionQuery = null
  }

  if (gl && buffer) {
    gl.deleteBuffer(buffer)
  }
  if (gl && program) {
    gl.deleteProgram(program)
  }
  gl = null
  program = null
  buffer = null
}

// Detect device capability level
function detectDeviceCapability(): 'high' | 'medium' | 'low' | 'veryLow' {
  const nav = navigator as Navigator & {
    deviceMemory?: number
    hardwareConcurrency?: number
    connection?: { effectiveType?: string; saveData?: boolean }
  }

  // Check for data saver mode
  if (nav.connection?.saveData) return 'veryLow'

  // Check connection type (slow connections = likely low-end device)
  const connType = nav.connection?.effectiveType
  if (connType === '2g' || connType === 'slow-2g') return 'veryLow'

  // Check device memory (Chrome/Edge only)
  const memory = nav.deviceMemory
  if (memory !== undefined) {
    if (memory <= 2) return 'veryLow'
    if (memory <= 4) return 'low'
    if (memory <= 8) return 'medium'
    return 'high'
  }

  // Check CPU cores as fallback
  const cores = nav.hardwareConcurrency
  if (cores !== undefined) {
    if (cores <= 2) return 'low'
    if (cores <= 4) return 'medium'
    return 'high'
  }

  // Check for mobile - be conservative
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    return 'low'
  }

  // Default to medium for unknown devices
  return 'medium'
}

// Quick GPU benchmark - render a few frames and measure time
function benchmarkGPU(): Promise<'fast' | 'slow' | 'verySlow'> {
  return new Promise((resolve) => {
    if (!gl || !program) {
      resolve('verySlow')
      return
    }

    const startBench = performance.now()
    const testFrames = 3

    // Render a few test frames
    for (let i = 0; i < testFrames; i++) {
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(program)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      gl.finish() // Force GPU to complete
    }

    const elapsed = performance.now() - startBench
    const avgFrameTime = elapsed / testFrames

    // If average frame takes > 50ms, GPU is very slow
    // If > 20ms, GPU is slow
    if (avgFrameTime > 50) {
      resolve('verySlow')
    } else if (avgFrameTime > 20) {
      resolve('slow')
    } else {
      resolve('fast')
    }
  })
}

onMounted(async () => {
  if (typeof window === 'undefined') return

  // Detect mobile
  isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  // Detect device capability
  const capability = detectDeviceCapability()
  isLowEndDevice = capability === 'low' || capability === 'veryLow'
  isVeryLowEndDevice = capability === 'veryLow'

  // For very low-end devices, show static background only
  if (isVeryLowEndDevice) {
    shouldAnimate = false
    return
  }

  // Check for reduced motion preference FIRST
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  prefersReducedMotion = reducedMotionQuery.matches
  reducedMotionQuery.addEventListener('change', handleReducedMotionChange)

  // If user prefers reduced motion, don't start WebGL at all
  if (prefersReducedMotion) {
    shouldAnimate = false
    return
  }

  if (initWebGL()) {
    // Run GPU benchmark and adjust settings
    const gpuSpeed = await benchmarkGPU()

    if (gpuSpeed === 'verySlow') {
      // GPU is too slow - disable animation entirely
      shouldAnimate = false
      cleanup()
      return
    } else if (gpuSpeed === 'slow' || isLowEndDevice) {
      // Reduce quality for slow GPUs
      effectiveDensity = 0.8  // Fewer stars
      effectiveNumLayers = 2   // Only 2 layers instead of 4
    } else if (capability === 'medium') {
      // Medium devices get slight reduction
      effectiveDensity = 1.2
      effectiveNumLayers = 3
    } else {
      // High-end devices get full quality
      effectiveDensity = props.density
      effectiveNumLayers = 4
    }

    startTime = performance.now()
    lastInputTime = performance.now() // Initialize idle timer
    resize()
    isReady.value = true
    render()

    window.addEventListener('resize', resize, { passive: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)

    if (props.mouseInteraction) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true })
      window.addEventListener('mouseleave', handleMouseLeave)
      // Touch events for mobile
      window.addEventListener('touchmove', handleTouchMove, { passive: true })
      window.addEventListener('touchend', handleTouchEnd, { passive: true })
    }
  }
})

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <div class="galaxy-container">
    <canvas
      ref="canvasRef"
      class="galaxy-canvas"
      :class="{ ready: isReady }"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.galaxy-container {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: #0a0a0f;
}

.galaxy-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.5s ease-out;
}

.galaxy-canvas.ready {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .galaxy-container {
    background: radial-gradient(ellipse at 50% 50%, #0f0f1a 0%, #050508 100%);
  }
  .galaxy-canvas {
    display: none;
  }
}
</style>
