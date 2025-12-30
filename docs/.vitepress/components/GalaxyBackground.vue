<script setup lang="ts">
/**
 * Galaxy Background Effect - Optimized WebGL Shader
 * Performance optimized star field with reduced GPU load
 */
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

interface Props {
  focal?: [number, number]
  starSpeed?: number
  density?: number
  hueShift?: number
  speed?: number
  glowIntensity?: number
  saturation?: number
  twinkleIntensity?: number
  rotationSpeed?: number
}

const props = withDefaults(defineProps<Props>(), {
  focal: () => [0.5, 0.5],
  starSpeed: 0.5,
  density: 0.8,
  hueShift: 140,
  speed: 0.8,
  glowIntensity: 0.5,
  saturation: 0.0,
  twinkleIntensity: 0.3,
  rotationSpeed: 0.05
})

const isClient = ref(false)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let gl: WebGLRenderingContext | null = null
let program: WebGLProgram | null = null
let animationId: number | null = null
let lastFrameTime = 0
const TARGET_FPS = 30 // Throttle to 30fps for performance

const vertexShader = `
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

// Optimized fragment shader - reduced layers and simplified math
const fragmentShader = `
precision mediump float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uFocal;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform float uGlowIntensity;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;

varying vec2 vUv;

#define NUM_LAYER 3.0
#define PI 3.14159265

// Simplified hash function
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Simple triangle wave
float tri(float x) {
  return abs(fract(x) * 2.0 - 1.0);
}

// Simplified HSV to RGB
vec3 hsv2rgb(float h, float s, float v) {
  vec3 c = vec3(h, s, v);
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z * mix(vec3(1.0), rgb, c.y);
}

// Optimized star - simpler glow calculation
float Star(vec2 uv, float brightness) {
  float d = length(uv);
  float m = (0.04 * uGlowIntensity * brightness) / (d + 0.01);
  m *= smoothstep(0.6, 0.0, d);
  return m;
}

// Simplified star layer - reduced neighbor check to 2x2
vec3 StarLayer(vec2 uv, float layerIndex) {
  vec3 col = vec3(0.0);

  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);

  // Only check immediate neighbors (2x2 instead of 3x3)
  for (int y = 0; y <= 1; y++) {
    for (int x = 0; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y)) - 0.5;
      vec2 si = id + offset;

      float seed = hash(si + layerIndex * 100.0);

      // Skip some stars based on seed for variety
      if (seed < 0.3) continue;

      float size = fract(seed * 345.32);

      // Simplified position jitter
      vec2 starPos = offset + vec2(hash(si * 1.1), hash(si * 1.3)) * 0.8 - 0.4;

      // Simplified twinkle
      float twinkle = tri(uTime * uSpeed * 0.5 + seed * 6.28) * uTwinkleIntensity + (1.0 - uTwinkleIntensity);

      float star = Star(gv - starPos, size * twinkle);

      // Simple color based on seed
      float hue = fract(seed + uHueShift / 360.0);
      vec3 starColor = hsv2rgb(hue, 0.3, 1.0);

      col += star * size * starColor;
    }
  }

  return col;
}

void main() {
  vec2 focalPx = uFocal * uResolution;
  vec2 uv = (vUv * uResolution - focalPx) / uResolution.y;

  // Simplified rotation
  float angle = uTime * uRotationSpeed;
  float c = cos(angle);
  float s = sin(angle);
  uv = mat2(c, -s, s, c) * uv;

  vec3 col = vec3(0.0);

  // 3 layers instead of 4
  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
    float depth = fract(i + uStarSpeed * uSpeed * 0.1);
    float scale = mix(15.0 * uDensity, 3.0 * uDensity, depth);
    float fade = depth * smoothstep(1.0, 0.8, depth);
    col += StarLayer(uv * scale + i * 453.32, i) * fade;
  }

  float alpha = length(col);
  alpha = smoothstep(0.0, 0.2, alpha);
  alpha = min(alpha, 0.9);

  gl_FragColor = vec4(col, alpha * 0.7);
}
`

function createShader(glCtx: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = glCtx.createShader(type)
  if (!shader) return null
  glCtx.shaderSource(shader, source)
  glCtx.compileShader(shader)
  if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
    console.error('Shader compile error:', glCtx.getShaderInfoLog(shader))
    glCtx.deleteShader(shader)
    return null
  }
  return shader
}

function createProgram(glCtx: WebGLRenderingContext, vs: string, fs: string): WebGLProgram | null {
  const vertShader = createShader(glCtx, glCtx.VERTEX_SHADER, vs)
  const fragShader = createShader(glCtx, glCtx.FRAGMENT_SHADER, fs)
  if (!vertShader || !fragShader) return null

  const prog = glCtx.createProgram()
  if (!prog) return null

  glCtx.attachShader(prog, vertShader)
  glCtx.attachShader(prog, fragShader)
  glCtx.linkProgram(prog)

  if (!glCtx.getProgramParameter(prog, glCtx.LINK_STATUS)) {
    console.error('Program link error:', glCtx.getProgramInfoLog(prog))
    glCtx.deleteProgram(prog)
    return null
  }

  return prog
}

let uniforms: Record<string, WebGLUniformLocation | null> = {}
let startTime = 0

function init() {
  if (!canvasRef.value) return

  gl = canvasRef.value.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false,
    powerPreference: 'low-power' // Request low-power GPU
  })
  if (!gl) return

  program = createProgram(gl, vertexShader, fragmentShader)
  if (!program) return

  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

  const posLoc = gl.getAttribLocation(program, 'position')
  gl.enableVertexAttribArray(posLoc)
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

  uniforms = {
    uTime: gl.getUniformLocation(program, 'uTime'),
    uResolution: gl.getUniformLocation(program, 'uResolution'),
    uFocal: gl.getUniformLocation(program, 'uFocal'),
    uStarSpeed: gl.getUniformLocation(program, 'uStarSpeed'),
    uDensity: gl.getUniformLocation(program, 'uDensity'),
    uHueShift: gl.getUniformLocation(program, 'uHueShift'),
    uSpeed: gl.getUniformLocation(program, 'uSpeed'),
    uGlowIntensity: gl.getUniformLocation(program, 'uGlowIntensity'),
    uTwinkleIntensity: gl.getUniformLocation(program, 'uTwinkleIntensity'),
    uRotationSpeed: gl.getUniformLocation(program, 'uRotationSpeed')
  }

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  startTime = performance.now()
  resize()
}

function resize() {
  if (!canvasRef.value || !gl) return

  // Balance quality and performance - use 1.5x max for visible stars
  const dpr = Math.min(1.5, window.devicePixelRatio || 1)
  const width = canvasRef.value.clientWidth
  const height = canvasRef.value.clientHeight

  canvasRef.value.width = width * dpr
  canvasRef.value.height = height * dpr

  gl.viewport(0, 0, canvasRef.value.width, canvasRef.value.height)
}

function render(currentTime: number) {
  // Throttle to target FPS
  const elapsed = currentTime - lastFrameTime
  const frameInterval = 1000 / TARGET_FPS

  if (elapsed < frameInterval) {
    animationId = requestAnimationFrame(render)
    return
  }

  lastFrameTime = currentTime - (elapsed % frameInterval)

  if (!gl || !program || !canvasRef.value) {
    animationId = requestAnimationFrame(render)
    return
  }

  const time = (performance.now() - startTime) * 0.001

  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  gl.useProgram(program)

  gl.uniform1f(uniforms.uTime, time)
  gl.uniform2f(uniforms.uResolution, canvasRef.value.width, canvasRef.value.height)
  gl.uniform2f(uniforms.uFocal, props.focal[0], props.focal[1])
  gl.uniform1f(uniforms.uStarSpeed, time * props.starSpeed * 0.1)
  gl.uniform1f(uniforms.uDensity, props.density)
  gl.uniform1f(uniforms.uHueShift, props.hueShift)
  gl.uniform1f(uniforms.uSpeed, props.speed)
  gl.uniform1f(uniforms.uGlowIntensity, props.glowIntensity)
  gl.uniform1f(uniforms.uTwinkleIntensity, props.twinkleIntensity)
  gl.uniform1f(uniforms.uRotationSpeed, props.rotationSpeed)

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  animationId = requestAnimationFrame(render)
}

// Debounced resize handler
let resizeTimeout: number | null = null
function handleResize() {
  if (resizeTimeout) clearTimeout(resizeTimeout)
  resizeTimeout = window.setTimeout(resize, 150)
}

function cleanup() {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
    resizeTimeout = null
  }
  window.removeEventListener('resize', handleResize)

  if (gl && program) {
    gl.deleteProgram(program)
    program = null
  }
  gl = null
}

onMounted(async () => {
  if (typeof window !== 'undefined') {
    isClient.value = true
    await nextTick()
    await nextTick()

    setTimeout(() => {
      init()
      if (gl && program) {
        lastFrameTime = performance.now()
        render(lastFrameTime)
        window.addEventListener('resize', handleResize, { passive: true })
      }
    }, 100)
  }
})

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <canvas
    v-if="isClient"
    ref="canvasRef"
    class="galaxy-background"
    aria-hidden="true"
  />
</template>

<style scoped>
.galaxy-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 1;
}

@media (prefers-reduced-motion: reduce) {
  .galaxy-background {
    display: none;
  }
}
</style>
