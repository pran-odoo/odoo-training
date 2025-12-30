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
let program: WebGLProgram | null = null
let buffer: WebGLBuffer | null = null
let animationId: number | null = null
let startTime = 0
let isVisible = true
let uniforms: Record<string, WebGLUniformLocation | null> = {}

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
precision highp float;

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

varying vec2 vUv;

#define NUM_LAYER 4.0
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

  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
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
    uMouseActiveFactor: gl.getUniformLocation(program, 'uMouseActiveFactor')
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
  if (!gl || !program) {
    animationId = requestAnimationFrame(render)
    return
  }

  if (!isVisible) {
    animationId = requestAnimationFrame(render)
    return
  }

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
  gl.uniform1f(uniforms.uDensity, props.density)
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

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  animationId = requestAnimationFrame(render)
}

function handleMouseMove(e: MouseEvent) {
  if (!props.mouseInteraction) return
  targetMouse.x = e.clientX / window.innerWidth
  targetMouse.y = 1.0 - e.clientY / window.innerHeight
  targetMouseActive = 1.0
}

function handleMouseLeave() {
  targetMouseActive = 0.0
}

function handleVisibilityChange() {
  isVisible = !document.hidden
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

onMounted(() => {
  if (typeof window === 'undefined') return

  if (initWebGL()) {
    startTime = performance.now()
    resize()
    isReady.value = true
    render()

    window.addEventListener('resize', resize, { passive: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)

    if (props.mouseInteraction) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true })
      window.addEventListener('mouseleave', handleMouseLeave)
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
