<script setup lang="ts">
/**
 * Galaxy Background Effect - WebGL Shader Implementation
 * Animated star field with twinkling effect
 *
 * REQUIREMENTS:
 * - Must show immediately on page load (no flicker)
 * - Must cover full viewport at all times
 * - Must work on scroll (fixed position)
 * - Must be behind all content (z-index: 0)
 * - Must have dark fallback background
 * - Must pause when tab is hidden (performance)
 * - Must clean up properly on unmount
 */
import { ref, onMounted, onUnmounted } from 'vue'

// Props for customization
interface Props {
  density?: number
  speed?: number
  glowIntensity?: number
  twinkleIntensity?: number
  rotationSpeed?: number
}

const props = withDefaults(defineProps<Props>(), {
  density: 1.0,
  speed: 0.8,
  glowIntensity: 0.5,
  twinkleIntensity: 0.5,
  rotationSpeed: 0.05
})

// Refs
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isReady = ref(false)
const webglSupported = ref(true)

// WebGL state (not reactive - internal only)
let gl: WebGLRenderingContext | null = null
let program: WebGLProgram | null = null
let buffer: WebGLBuffer | null = null
let vertShader: WebGLShader | null = null
let fragShader: WebGLShader | null = null
let animationId: number | null = null
let startTime = 0
let isVisible = true

// Uniforms cache
let uniforms: Record<string, WebGLUniformLocation | null> = {}

// Shaders
const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uDensity;
uniform float uSpeed;
uniform float uGlow;
uniform float uTwinkle;
uniform float uRotation;

varying vec2 vUv;

#define NUM_LAYERS 4.0
#define PI 3.14159265359

// Hash function for randomness
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Triangle wave for smooth oscillation
float tri(float x) {
  return abs(fract(x) * 2.0 - 1.0);
}

// Smooth triangle wave
float smoothTri(float x) {
  float t = fract(x);
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}

// Star shape with glow and rays
float star(vec2 uv, float flare) {
  float d = length(uv);
  float m = (0.05 * uGlow) / d;

  // Cross rays
  float rays = max(0.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * flare * uGlow * 0.5;

  // Diagonal rays (rotated 45 degrees)
  vec2 uvRot = uv * mat2(0.707, -0.707, 0.707, 0.707);
  rays = max(0.0, 1.0 - abs(uvRot.x * uvRot.y * 1000.0));
  m += rays * flare * uGlow * 0.25;

  // Fade at edges
  m *= smoothstep(1.0, 0.2, d);

  return m;
}

// Generate a layer of stars
vec3 starLayer(vec2 uv, float layerOffset) {
  vec3 col = vec3(0.0);

  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);

  // Check 3x3 neighborhood for stars
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 cellId = id + offset;

      float h = hash(cellId + layerOffset);
      float size = fract(h * 345.32);

      // Skip small stars for performance
      if (size < 0.3) continue;

      // Star position jitter
      vec2 jitter = vec2(hash(cellId * 1.1), hash(cellId * 2.3)) - 0.5;
      jitter *= 0.8;

      // Twinkle effect
      float twinkle = smoothTri(uTime * uSpeed * 0.5 + h * 6.283) * uTwinkle;
      twinkle = mix(0.5, 1.0, twinkle);

      // Flare for larger stars
      float flare = smoothstep(0.8, 1.0, size) * tri(uTime * 0.2 + h);

      // Star color (slight blue/white tint)
      vec3 starCol = vec3(0.8 + h * 0.2, 0.85 + h * 0.15, 1.0);

      // Compute star
      float s = star(gv - offset - jitter, flare);
      col += s * size * twinkle * starCol;
    }
  }

  return col;
}

void main() {
  // Normalized coordinates centered
  vec2 uv = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);

  // Slow rotation
  float angle = uTime * uRotation;
  float c = cos(angle);
  float s = sin(angle);
  uv = mat2(c, -s, s, c) * uv;

  // Accumulate star layers
  vec3 col = vec3(0.0);

  for (float i = 0.0; i < NUM_LAYERS; i++) {
    float depth = (i + 1.0) / NUM_LAYERS;
    float scale = mix(30.0, 5.0, depth) * uDensity;
    float brightness = depth * 0.7 + 0.3;

    col += starLayer(uv * scale + i * 100.0, i) * brightness;
  }

  // Subtle vignette
  float vignette = 1.0 - length(vUv - 0.5) * 0.5;
  col *= vignette;

  // Output with alpha
  float alpha = min(length(col) * 2.0, 1.0);
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

  // Get WebGL context
  gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false,
    powerPreference: 'low-power'
  })

  if (!gl) {
    console.warn('WebGL not supported')
    webglSupported.value = false
    return false
  }

  // Create shaders
  vertShader = createShader(gl.VERTEX_SHADER, VERTEX_SHADER)
  fragShader = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER)

  if (!vertShader || !fragShader) return false

  // Create program
  program = gl.createProgram()
  if (!program) return false

  gl.attachShader(program, vertShader)
  gl.attachShader(program, fragShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Galaxy program error:', gl.getProgramInfoLog(program))
    return false
  }

  // Create fullscreen quad
  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
  buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

  // Setup attribute
  const posLoc = gl.getAttribLocation(program, 'aPosition')
  gl.enableVertexAttribArray(posLoc)
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

  // Get uniform locations
  gl.useProgram(program)
  uniforms = {
    uTime: gl.getUniformLocation(program, 'uTime'),
    uResolution: gl.getUniformLocation(program, 'uResolution'),
    uDensity: gl.getUniformLocation(program, 'uDensity'),
    uSpeed: gl.getUniformLocation(program, 'uSpeed'),
    uGlow: gl.getUniformLocation(program, 'uGlow'),
    uTwinkle: gl.getUniformLocation(program, 'uTwinkle'),
    uRotation: gl.getUniformLocation(program, 'uRotation')
  }

  // Setup blending
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  return true
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas || !gl) return

  // Use actual viewport size
  const width = window.innerWidth
  const height = window.innerHeight
  const dpr = Math.min(window.devicePixelRatio || 1, 2)

  const displayWidth = Math.floor(width * dpr)
  const displayHeight = Math.floor(height * dpr)

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth
    canvas.height = displayHeight
    gl.viewport(0, 0, displayWidth, displayHeight)
  }
}

function render() {
  if (!gl || !program || !isVisible) {
    animationId = requestAnimationFrame(render)
    return
  }

  const time = (performance.now() - startTime) * 0.001

  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  gl.useProgram(program)

  // Update uniforms
  gl.uniform1f(uniforms.uTime, time)
  gl.uniform2f(uniforms.uResolution, canvasRef.value!.width, canvasRef.value!.height)
  gl.uniform1f(uniforms.uDensity, props.density)
  gl.uniform1f(uniforms.uSpeed, props.speed)
  gl.uniform1f(uniforms.uGlow, props.glowIntensity)
  gl.uniform1f(uniforms.uTwinkle, props.twinkleIntensity)
  gl.uniform1f(uniforms.uRotation, props.rotationSpeed)

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  animationId = requestAnimationFrame(render)
}

function handleVisibilityChange() {
  isVisible = !document.hidden
}

function handleResize() {
  resize()
}

function cleanup() {
  // Cancel animation
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }

  // Remove listeners
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('resize', handleResize)

  // Clean up WebGL resources
  if (gl) {
    if (buffer) {
      gl.deleteBuffer(buffer)
      buffer = null
    }
    if (vertShader) {
      gl.deleteShader(vertShader)
      vertShader = null
    }
    if (fragShader) {
      gl.deleteShader(fragShader)
      fragShader = null
    }
    if (program) {
      gl.deleteProgram(program)
      program = null
    }
  }

  gl = null
  uniforms = {}
}

onMounted(() => {
  // SSR guard
  if (typeof window === 'undefined') return

  // Initialize immediately - canvas should be ready
  if (initWebGL()) {
    startTime = performance.now()
    resize()
    isReady.value = true

    // Start render loop
    render()

    // Add listeners
    window.addEventListener('resize', handleResize, { passive: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)
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
  /* Dark background fallback - visible before WebGL loads */
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

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .galaxy-container {
    /* Show static dark background instead */
    background: radial-gradient(ellipse at 50% 50%, #0f0f1a 0%, #050508 100%);
  }

  .galaxy-canvas {
    display: none;
  }
}
</style>
