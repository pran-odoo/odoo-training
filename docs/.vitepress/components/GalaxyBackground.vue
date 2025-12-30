<script setup lang="ts">
/**
 * Galaxy Background Effect - WebGL Shader Implementation
 * Animated star field with mouse interaction
 * Client-side only to avoid hydration mismatches
 */
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  focal?: [number, number]
  starSpeed?: number
  density?: number
  hueShift?: number
  speed?: number
  glowIntensity?: number
  saturation?: number
  mouseRepulsion?: boolean
  twinkleIntensity?: number
  rotationSpeed?: number
  repulsionStrength?: number
}

const props = withDefaults(defineProps<Props>(), {
  focal: () => [0.5, 0.5],
  starSpeed: 0.3,
  density: 0.6,
  hueShift: 140,
  speed: 0.3,
  glowIntensity: 0.2,
  saturation: 0.0,
  mouseRepulsion: true,
  twinkleIntensity: 0.15,
  rotationSpeed: 0.03,
  repulsionStrength: 1.0
})

// Client-side only rendering to prevent hydration mismatch
const isClient = ref(false)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let gl: WebGLRenderingContext | null = null
let program: WebGLProgram | null = null
let animationId: number | null = null

const mousePos = { x: 0.5, y: 0.5 }
const smoothMousePos = { x: 0.5, y: 0.5 }
let mouseActive = 0.0
let smoothMouseActive = 0.0

// Simplified shader for better performance
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
uniform vec2 uMouse;
uniform float uGlowIntensity;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;

varying vec2 vUv;

#define NUM_LAYER 3.0

float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float Star(vec2 uv, float flare) {
  float d = length(uv);
  float m = (0.04 * uGlowIntensity) / d;
  m *= smoothstep(1.0, 0.2, d);
  return m;
}

vec3 StarLayer(vec2 uv, float layerIndex) {
  vec3 col = vec3(0.0);

  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);

  // Reduced loop iterations for performance
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 si = id + offset;
      float seed = Hash21(si);
      float size = fract(seed * 345.32);

      // Simplified color - white/blue tint
      float hue = fract(seed + uHueShift / 360.0);
      vec3 base = vec3(0.8 + hue * 0.2, 0.85 + seed * 0.15, 1.0);

      vec2 starPos = gv - offset - (vec2(seed, fract(seed * 13.7)) - 0.5) * 0.6;
      float star = Star(starPos, size);

      // Simple twinkle
      float twinkle = sin(uTime * uSpeed * 2.0 + seed * 6.28) * 0.3 + 0.7;
      twinkle = mix(1.0, twinkle, uTwinkleIntensity);
      star *= twinkle;

      col += star * size * base;
    }
  }

  return col;
}

void main() {
  vec2 focalPx = uFocal * uResolution;
  vec2 uv = (vUv * uResolution - focalPx) / uResolution.y;

  // Mouse repulsion (simplified)
  vec2 mousePosUV = (uMouse * uResolution - focalPx) / uResolution.y;
  float mouseDist = length(uv - mousePosUV);
  vec2 repulsion = (uv - mousePosUV) / (mouseDist + 0.3) * uRepulsionStrength * 0.02;
  uv += repulsion * uMouseActiveFactor;

  // Slow rotation
  float angle = uTime * uRotationSpeed;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  uv = rot * uv;

  vec3 col = vec3(0.0);

  // Reduced layers for performance
  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
    float depth = fract(i + uStarSpeed * uSpeed * 0.5);
    float scale = mix(15.0 * uDensity, 3.0 * uDensity, depth);
    float fade = depth * smoothstep(1.0, 0.8, depth);
    col += StarLayer(uv * scale + i * 453.32, i) * fade * 0.7;
  }

  float alpha = length(col);
  alpha = smoothstep(0.0, 0.25, alpha);
  alpha = min(alpha, 0.9);
  gl_FragColor = vec4(col, alpha * 0.6);
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
    powerPreference: 'low-power'
  })
  if (!gl) {
    console.warn('WebGL not supported for galaxy background')
    return
  }

  program = createProgram(gl, vertexShader, fragmentShader)
  if (!program) return

  // Create fullscreen quad
  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

  const posLoc = gl.getAttribLocation(program, 'position')
  gl.enableVertexAttribArray(posLoc)
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

  // Get uniform locations
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
    uTwinkleIntensity: gl.getUniformLocation(program, 'uTwinkleIntensity'),
    uRotationSpeed: gl.getUniformLocation(program, 'uRotationSpeed'),
    uRepulsionStrength: gl.getUniformLocation(program, 'uRepulsionStrength'),
    uMouseActiveFactor: gl.getUniformLocation(program, 'uMouseActiveFactor')
  }

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  startTime = performance.now()
  resize()
}

function resize() {
  if (!canvasRef.value || !gl) return

  // Lower resolution for better performance
  const dpr = Math.min(1.0, window.devicePixelRatio || 1)
  const width = canvasRef.value.clientWidth
  const height = canvasRef.value.clientHeight

  canvasRef.value.width = width * dpr
  canvasRef.value.height = height * dpr

  gl.viewport(0, 0, canvasRef.value.width, canvasRef.value.height)
}

function render() {
  if (!gl || !program || !canvasRef.value) {
    animationId = requestAnimationFrame(render)
    return
  }

  const time = (performance.now() - startTime) * 0.001

  // Smooth mouse interpolation
  const lerpFactor = 0.03
  smoothMousePos.x += (mousePos.x - smoothMousePos.x) * lerpFactor
  smoothMousePos.y += (mousePos.y - smoothMousePos.y) * lerpFactor
  smoothMouseActive += (mouseActive - smoothMouseActive) * lerpFactor

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
  gl.uniform2f(uniforms.uMouse, smoothMousePos.x, smoothMousePos.y)
  gl.uniform1f(uniforms.uGlowIntensity, props.glowIntensity)
  gl.uniform1f(uniforms.uTwinkleIntensity, props.twinkleIntensity)
  gl.uniform1f(uniforms.uRotationSpeed, props.rotationSpeed)
  gl.uniform1f(uniforms.uRepulsionStrength, props.repulsionStrength)
  gl.uniform1f(uniforms.uMouseActiveFactor, smoothMouseActive)

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  animationId = requestAnimationFrame(render)
}

function handleMouseMove(e: MouseEvent) {
  if (!canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  mousePos.x = (e.clientX - rect.left) / rect.width
  mousePos.y = 1.0 - (e.clientY - rect.top) / rect.height
  mouseActive = 1.0
}

function handleMouseLeave() {
  mouseActive = 0.0
}

function cleanup() {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  window.removeEventListener('resize', resize)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseleave', handleMouseLeave)

  // Clean up WebGL resources
  if (gl && program) {
    gl.deleteProgram(program)
    program = null
  }
  gl = null
}

onMounted(() => {
  // Only render on client side
  if (typeof window !== 'undefined') {
    isClient.value = true
    // Delay initialization to avoid blocking
    requestAnimationFrame(() => {
      init()
      render()
      window.addEventListener('resize', resize)
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseleave', handleMouseLeave)
    })
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
