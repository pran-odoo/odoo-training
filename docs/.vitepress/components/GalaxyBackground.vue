<script setup lang="ts">
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
  starSpeed: 0.5,
  density: 1,
  hueShift: 140,
  speed: 1.0,
  glowIntensity: 0.3,
  saturation: 0.0,
  mouseRepulsion: true,
  twinkleIntensity: 0.3,
  rotationSpeed: 0.1,
  repulsionStrength: 2
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
let gl: WebGLRenderingContext | null = null
let program: WebGLProgram | null = null
let animationId: number | null = null

const mousePos = { x: 0.5, y: 0.5 }
const smoothMousePos = { x: 0.5, y: 0.5 }
let mouseActive = 0.0
let smoothMouseActive = 0.0

const vertexShader = `
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragmentShader = `
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
      vec2 si = id + offset;
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
  gl_FragColor = vec4(col, alpha * 0.8);
}
`

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function createProgram(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram | null {
  const vertShader = createShader(gl, gl.VERTEX_SHADER, vs)
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fs)
  if (!vertShader || !fragShader) return null

  const prog = gl.createProgram()
  if (!prog) return null

  gl.attachShader(prog, vertShader)
  gl.attachShader(prog, fragShader)
  gl.linkProgram(prog)

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(prog))
    gl.deleteProgram(prog)
    return null
  }

  return prog
}

let uniforms: Record<string, WebGLUniformLocation | null> = {}
let startTime = 0

function init() {
  if (!canvasRef.value) return

  gl = canvasRef.value.getContext('webgl', { alpha: true, premultipliedAlpha: false })
  if (!gl) {
    console.error('WebGL not supported')
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
    uSaturation: gl.getUniformLocation(program, 'uSaturation'),
    uMouseRepulsion: gl.getUniformLocation(program, 'uMouseRepulsion'),
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

  const dpr = Math.min(1.5, window.devicePixelRatio || 1)
  const width = canvasRef.value.clientWidth
  const height = canvasRef.value.clientHeight

  canvasRef.value.width = width * dpr
  canvasRef.value.height = height * dpr

  gl.viewport(0, 0, canvasRef.value.width, canvasRef.value.height)
}

function render() {
  if (!gl || !program) return

  const time = (performance.now() - startTime) * 0.001

  // Smooth mouse interpolation
  const lerpFactor = 0.05
  smoothMousePos.x += (mousePos.x - smoothMousePos.x) * lerpFactor
  smoothMousePos.y += (mousePos.y - smoothMousePos.y) * lerpFactor
  smoothMouseActive += (mouseActive - smoothMouseActive) * lerpFactor

  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  gl.useProgram(program)

  gl.uniform1f(uniforms.uTime, time)
  gl.uniform2f(uniforms.uResolution, canvasRef.value!.width, canvasRef.value!.height)
  gl.uniform2f(uniforms.uFocal, props.focal[0], props.focal[1])
  gl.uniform1f(uniforms.uStarSpeed, time * props.starSpeed * 0.1)
  gl.uniform1f(uniforms.uDensity, props.density)
  gl.uniform1f(uniforms.uHueShift, props.hueShift)
  gl.uniform1f(uniforms.uSpeed, props.speed)
  gl.uniform2f(uniforms.uMouse, smoothMousePos.x, smoothMousePos.y)
  gl.uniform1f(uniforms.uGlowIntensity, props.glowIntensity)
  gl.uniform1f(uniforms.uSaturation, props.saturation)
  gl.uniform1i(uniforms.uMouseRepulsion, props.mouseRepulsion ? 1 : 0)
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

onMounted(() => {
  init()
  render()
  window.addEventListener('resize', resize)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseleave', handleMouseLeave)
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', resize)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseleave', handleMouseLeave)
})
</script>

<template>
  <canvas ref="canvasRef" class="galaxy-background" />
</template>

<style scoped>
.galaxy-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: -1;
}
</style>
