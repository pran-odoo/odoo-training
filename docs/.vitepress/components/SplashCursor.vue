<script setup lang="ts">
/**
 * SplashCursor - WebGL Fluid Simulation Cursor Effect
 * Converted from React to Vue 3 for VitePress
 *
 * Creates colorful fluid trails that follow mouse/touch movement
 *
 * Features:
 * - WebGL2 with WebGL1 fallback
 * - Full resource cleanup on unmount
 * - Visibility API integration (pauses when hidden)
 * - Reduced motion support
 * - Proper resize handling with debounce
 */
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  simResolution?: number
  dyeResolution?: number
  densityDissipation?: number
  velocityDissipation?: number
  pressure?: number
  pressureIterations?: number
  curl?: number
  splatRadius?: number
  splatForce?: number
  shading?: boolean
  colorUpdateSpeed?: number
}

const props = withDefaults(defineProps<Props>(), {
  simResolution: 128,
  dyeResolution: 1024,
  densityDissipation: 3.0,
  velocityDissipation: 2.0,
  pressure: 0.1,
  pressureIterations: 20,
  curl: 3,
  splatRadius: 0.15,
  splatForce: 6000,
  shading: true,
  colorUpdateSpeed: 10
})

// Refs
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isReady = ref(false)

// WebGL state
let gl: WebGL2RenderingContext | WebGLRenderingContext | null = null
let isWebGL2 = false
let animationId: number | null = null
let lastTime = 0
let lastRenderTime = 0
const TARGET_FPS = 30 // Limit to 30fps for performance
const FRAME_TIME = 1000 / TARGET_FPS
let colorUpdateTimer = 0
let isVisible = true
let needsResize = false

// Idle detection - stop simulation when pointer not moving
const IDLE_TIMEOUT = 2000 // 2 seconds of no pointer movement
let lastPointerMoveTime = 0
let isIdle = false
let shouldAnimate = true
let prefersReducedMotion = false
let reducedMotionQuery: MediaQueryList | null = null
let isMobile = false
let isLowEndDevice = false

// Resolution scaling based on device capability
let effectiveSimResolution = 128
let effectiveDyeResolution = 1024

// Buffers to clean up
let vertexBuffer: WebGLBuffer | null = null
let indexBuffer: WebGLBuffer | null = null

// Extensions and formats
interface ExtFormats {
  formatRGBA: { internalFormat: number; format: number }
  formatRG: { internalFormat: number; format: number }
  formatR: { internalFormat: number; format: number }
  halfFloatTexType: number
  supportLinearFiltering: boolean
}
let ext: ExtFormats | null = null

// Framebuffers
interface FBO {
  texture: WebGLTexture
  fbo: WebGLFramebuffer
  width: number
  height: number
  texelSizeX: number
  texelSizeY: number
  attach: (id: number) => number
}

interface DoubleFBO {
  width: number
  height: number
  texelSizeX: number
  texelSizeY: number
  read: FBO
  write: FBO
  swap: () => void
}

let dye: DoubleFBO | null = null
let velocity: DoubleFBO | null = null
let divergenceFBO: FBO | null = null
let curlFBO: FBO | null = null
let pressure: DoubleFBO | null = null

// All created textures and framebuffers for cleanup
let allTextures: WebGLTexture[] = []
let allFramebuffers: WebGLFramebuffer[] = []

// Programs and shaders
interface Program {
  program: WebGLProgram
  uniforms: Record<string, WebGLUniformLocation | null>
}

let allPrograms: WebGLProgram[] = []
let allShaders: WebGLShader[] = []

let copyProgram: Program | null = null
let clearProgram: Program | null = null
let splatProgram: Program | null = null
let advectionProgram: Program | null = null
let divergenceProgram: Program | null = null
let curlProgram: Program | null = null
let vorticityProgram: Program | null = null
let pressureProgram: Program | null = null
let gradientSubtractProgram: Program | null = null
let displayProgram: Program | null = null

// Pointer state
interface Pointer {
  id: number
  texcoordX: number
  texcoordY: number
  prevTexcoordX: number
  prevTexcoordY: number
  deltaX: number
  deltaY: number
  down: boolean
  moved: boolean
  color: { r: number; g: number; b: number }
}

let pointer: Pointer = {
  id: -1,
  texcoordX: 0,
  texcoordY: 0,
  prevTexcoordX: 0,
  prevTexcoordY: 0,
  deltaX: 0,
  deltaY: 0,
  down: false,
  moved: false,
  color: { r: 0, g: 0, b: 0 }
}

// Blit function
let blit: ((target: FBO | null, clear?: boolean) => void) | null = null

// ============================================
// SHADERS
// ============================================

const baseVertexShader = `
precision highp float;
attribute vec2 aPosition;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform vec2 texelSize;

void main () {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const copyShader = `
precision mediump float;
uniform sampler2D uTexture;
varying vec2 vUv;
void main () {
  gl_FragColor = texture2D(uTexture, vUv);
}
`

const clearShader = `
precision mediump float;
uniform sampler2D uTexture;
uniform float value;
varying vec2 vUv;
void main () {
  gl_FragColor = value * texture2D(uTexture, vUv);
}
`

const splatShader = `
precision highp float;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
varying vec2 vUv;

void main () {
  vec2 p = vUv - point.xy;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color;
  vec3 base = texture2D(uTarget, vUv).xyz;
  gl_FragColor = vec4(base + splat, 1.0);
}
`

const advectionShader = `
precision highp float;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;
varying vec2 vUv;

void main () {
  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
  vec4 result = texture2D(uSource, coord);
  float decay = 1.0 + dissipation * dt;
  gl_FragColor = result / decay;
}
`

const divergenceShader = `
precision mediump float;
uniform sampler2D uVelocity;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

void main () {
  float L = texture2D(uVelocity, vL).x;
  float R = texture2D(uVelocity, vR).x;
  float T = texture2D(uVelocity, vT).y;
  float B = texture2D(uVelocity, vB).y;
  vec2 C = texture2D(uVelocity, vUv).xy;
  if (vL.x < 0.0) L = -C.x;
  if (vR.x > 1.0) R = -C.x;
  if (vT.y > 1.0) T = -C.y;
  if (vB.y < 0.0) B = -C.y;
  float div = 0.5 * (R - L + T - B);
  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}
`

const curlShaderSrc = `
precision mediump float;
uniform sampler2D uVelocity;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

void main () {
  float L = texture2D(uVelocity, vL).y;
  float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x;
  float B = texture2D(uVelocity, vB).x;
  float vorticity = R - L - T + B;
  gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}
`

const vorticityShader = `
precision highp float;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

void main () {
  float L = texture2D(uCurl, vL).x;
  float R = texture2D(uCurl, vR).x;
  float T = texture2D(uCurl, vT).x;
  float B = texture2D(uCurl, vB).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 vel = texture2D(uVelocity, vUv).xy;
  vel += force * dt;
  vel = min(max(vel, -1000.0), 1000.0);
  gl_FragColor = vec4(vel, 0.0, 1.0);
}
`

const pressureShader = `
precision mediump float;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  float divergence = texture2D(uDivergence, vUv).x;
  float p = (L + R + B + T - divergence) * 0.25;
  gl_FragColor = vec4(p, 0.0, 0.0, 1.0);
}
`

const gradientSubtractShader = `
precision mediump float;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  vec2 vel = texture2D(uVelocity, vUv).xy;
  vel.xy -= vec2(R - L, T - B);
  gl_FragColor = vec4(vel, 0.0, 1.0);
}
`

const displayShader = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 texelSize;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

void main () {
  vec3 c = texture2D(uTexture, vUv).rgb;

  #ifdef SHADING
  vec3 lc = texture2D(uTexture, vL).rgb;
  vec3 rc = texture2D(uTexture, vR).rgb;
  vec3 tc = texture2D(uTexture, vT).rgb;
  vec3 bc = texture2D(uTexture, vB).rgb;
  float dx = length(rc) - length(lc);
  float dy = length(tc) - length(bc);
  vec3 n = normalize(vec3(dx, dy, length(texelSize)));
  vec3 l = vec3(0.0, 0.0, 1.0);
  float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
  c *= diffuse;
  #endif

  float a = max(c.r, max(c.g, c.b));
  gl_FragColor = vec4(c, a);
}
`

// ============================================
// HELPER FUNCTIONS
// ============================================

function compileShader(type: number, source: string, keywords: string[] | null = null): WebGLShader | null {
  if (!gl) return null

  let src = source
  if (keywords && keywords.length > 0) {
    src = keywords.map(k => `#define ${k}\n`).join('') + source
  }

  const shader = gl.createShader(type)
  if (!shader) return null

  gl.shaderSource(shader, src)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('SplashCursor shader error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }

  allShaders.push(shader)
  return shader
}

function createProgramFromShaders(vertexSource: string, fragmentSource: string, keywords: string[] | null = null): Program | null {
  if (!gl) return null

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource, keywords)

  if (!vertexShader || !fragmentShader) return null

  const program = gl.createProgram()
  if (!program) return null

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('SplashCursor program error:', gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }

  allPrograms.push(program)

  // Get uniforms
  const uniforms: Record<string, WebGLUniformLocation | null> = {}
  const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
  for (let i = 0; i < uniformCount; i++) {
    const info = gl.getActiveUniform(program, i)
    if (info) {
      uniforms[info.name] = gl.getUniformLocation(program, info.name)
    }
  }

  return { program, uniforms }
}

function getResolution(resolution: number) {
  if (!gl) return { width: 0, height: 0 }

  const aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight
  if (aspectRatio < 1) {
    return { width: Math.round(resolution), height: Math.round(resolution / aspectRatio) }
  }
  return { width: Math.round(resolution * aspectRatio), height: Math.round(resolution) }
}

function createFBO(w: number, h: number, internalFormat: number, format: number, type: number, filter: number): FBO | null {
  if (!gl) return null

  gl.activeTexture(gl.TEXTURE0)
  const texture = gl.createTexture()
  if (!texture) return null

  allTextures.push(texture)

  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null)

  const fbo = gl.createFramebuffer()
  if (!fbo) return null

  allFramebuffers.push(fbo)

  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
  gl.viewport(0, 0, w, h)
  gl.clear(gl.COLOR_BUFFER_BIT)

  const texelSizeX = 1 / w
  const texelSizeY = 1 / h

  const glRef = gl
  return {
    texture,
    fbo,
    width: w,
    height: h,
    texelSizeX,
    texelSizeY,
    attach(id: number) {
      glRef.activeTexture(glRef.TEXTURE0 + id)
      glRef.bindTexture(glRef.TEXTURE_2D, texture)
      return id
    }
  }
}

function createDoubleFBO(w: number, h: number, internalFormat: number, format: number, type: number, filter: number): DoubleFBO | null {
  const fbo1 = createFBO(w, h, internalFormat, format, type, filter)
  const fbo2 = createFBO(w, h, internalFormat, format, type, filter)
  if (!fbo1 || !fbo2) return null

  return {
    width: w,
    height: h,
    texelSizeX: fbo1.texelSizeX,
    texelSizeY: fbo1.texelSizeY,
    read: fbo1,
    write: fbo2,
    swap() {
      const tmp = this.read
      this.read = this.write
      this.write = tmp
    }
  }
}

function initWebGL(): boolean {
  const canvas = canvasRef.value
  if (!canvas) return false

  const params = {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    preserveDrawingBuffer: false,
    powerPreference: 'low-power' as const
  }

  // Try WebGL2 first
  gl = canvas.getContext('webgl2', params) as WebGL2RenderingContext | null
  isWebGL2 = !!gl

  if (!gl) {
    gl = canvas.getContext('webgl', params) as WebGLRenderingContext | null
  }

  if (!gl) {
    console.warn('WebGL not supported for SplashCursor')
    return false
  }

  // Get extensions and formats
  let halfFloatTexType: number
  let supportLinearFiltering = false

  if (isWebGL2) {
    const gl2 = gl as WebGL2RenderingContext
    gl2.getExtension('EXT_color_buffer_float')
    supportLinearFiltering = !!gl2.getExtension('OES_texture_float_linear')
    halfFloatTexType = gl2.HALF_FLOAT
  } else {
    const halfFloat = gl.getExtension('OES_texture_half_float')
    supportLinearFiltering = !!gl.getExtension('OES_texture_half_float_linear')
    halfFloatTexType = halfFloat?.HALF_FLOAT_OES || 0
  }

  gl.clearColor(0, 0, 0, 0)

  // Get supported formats
  const formatRGBA = isWebGL2
    ? { internalFormat: (gl as WebGL2RenderingContext).RGBA16F, format: gl.RGBA }
    : { internalFormat: gl.RGBA, format: gl.RGBA }
  const formatRG = isWebGL2
    ? { internalFormat: (gl as WebGL2RenderingContext).RG16F, format: (gl as WebGL2RenderingContext).RG }
    : { internalFormat: gl.RGBA, format: gl.RGBA }
  const formatR = isWebGL2
    ? { internalFormat: (gl as WebGL2RenderingContext).R16F, format: (gl as WebGL2RenderingContext).RED }
    : { internalFormat: gl.RGBA, format: gl.RGBA }

  ext = {
    formatRGBA,
    formatRG,
    formatR,
    halfFloatTexType,
    supportLinearFiltering
  }

  // Create vertex buffer
  vertexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW)

  // Create index buffer
  indexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW)

  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(0)

  // Blit function
  const glRef = gl
  blit = (target: FBO | null, clear = false) => {
    if (!glRef) return
    if (target) {
      glRef.viewport(0, 0, target.width, target.height)
      glRef.bindFramebuffer(glRef.FRAMEBUFFER, target.fbo)
    } else {
      glRef.viewport(0, 0, glRef.drawingBufferWidth, glRef.drawingBufferHeight)
      glRef.bindFramebuffer(glRef.FRAMEBUFFER, null)
    }
    if (clear) {
      glRef.clearColor(0, 0, 0, 0)
      glRef.clear(glRef.COLOR_BUFFER_BIT)
    }
    glRef.drawElements(glRef.TRIANGLES, 6, glRef.UNSIGNED_SHORT, 0)
  }

  // Create programs
  const keywords = props.shading ? ['SHADING'] : []

  copyProgram = createProgramFromShaders(baseVertexShader, copyShader)
  clearProgram = createProgramFromShaders(baseVertexShader, clearShader)
  splatProgram = createProgramFromShaders(baseVertexShader, splatShader)
  advectionProgram = createProgramFromShaders(baseVertexShader, advectionShader)
  divergenceProgram = createProgramFromShaders(baseVertexShader, divergenceShader)
  curlProgram = createProgramFromShaders(baseVertexShader, curlShaderSrc)
  vorticityProgram = createProgramFromShaders(baseVertexShader, vorticityShader)
  pressureProgram = createProgramFromShaders(baseVertexShader, pressureShader)
  gradientSubtractProgram = createProgramFromShaders(baseVertexShader, gradientSubtractShader)
  displayProgram = createProgramFromShaders(baseVertexShader, displayShader, keywords)

  if (!copyProgram || !clearProgram || !splatProgram || !advectionProgram ||
      !divergenceProgram || !curlProgram || !vorticityProgram || !pressureProgram ||
      !gradientSubtractProgram || !displayProgram) {
    return false
  }

  return true
}

function initFramebuffers() {
  if (!gl || !ext) return

  // Use effective resolutions (scaled based on device capability)
  const simRes = getResolution(effectiveSimResolution)
  const dyeRes = getResolution(effectiveDyeResolution)
  const filter = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST

  gl.disable(gl.BLEND)

  dye = createDoubleFBO(dyeRes.width, dyeRes.height, ext.formatRGBA.internalFormat, ext.formatRGBA.format, ext.halfFloatTexType, filter)
  velocity = createDoubleFBO(simRes.width, simRes.height, ext.formatRG.internalFormat, ext.formatRG.format, ext.halfFloatTexType, filter)
  divergenceFBO = createFBO(simRes.width, simRes.height, ext.formatR.internalFormat, ext.formatR.format, ext.halfFloatTexType, gl.NEAREST)
  curlFBO = createFBO(simRes.width, simRes.height, ext.formatR.internalFormat, ext.formatR.format, ext.halfFloatTexType, gl.NEAREST)
  pressure = createDoubleFBO(simRes.width, simRes.height, ext.formatR.internalFormat, ext.formatR.format, ext.halfFloatTexType, gl.NEAREST)
}

function resizeCanvas(): boolean {
  const canvas = canvasRef.value
  if (!canvas) return false

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = Math.floor(canvas.clientWidth * dpr)
  const height = Math.floor(canvas.clientHeight * dpr)

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
    return true
  }
  return false
}

function HSVtoRGB(h: number, s: number, v: number) {
  let r = 0, g = 0, b = 0
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }

  return { r, g, b }
}

function generateColor() {
  const c = HSVtoRGB(Math.random(), 1.0, 1.0)
  c.r *= 0.15
  c.g *= 0.15
  c.b *= 0.15
  return c
}

function splat(x: number, y: number, dx: number, dy: number, color: { r: number; g: number; b: number }) {
  if (!gl || !splatProgram || !velocity || !dye || !blit || !canvasRef.value) return

  gl.useProgram(splatProgram.program)
  gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0))
  gl.uniform1f(splatProgram.uniforms.aspectRatio, canvasRef.value.width / canvasRef.value.height)
  gl.uniform2f(splatProgram.uniforms.point, x, y)
  gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0)
  gl.uniform1f(splatProgram.uniforms.radius, props.splatRadius / 100)
  blit(velocity.write)
  velocity.swap()

  gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0))
  gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b)
  blit(dye.write)
  dye.swap()
}

function step(dt: number) {
  if (!gl || !velocity || !dye || !divergenceFBO || !curlFBO || !pressure || !blit) return
  if (!curlProgram || !vorticityProgram || !divergenceProgram || !clearProgram ||
      !pressureProgram || !gradientSubtractProgram || !advectionProgram) return

  gl.disable(gl.BLEND)

  // Curl
  gl.useProgram(curlProgram.program)
  gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
  gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0))
  blit(curlFBO)

  // Vorticity
  gl.useProgram(vorticityProgram.program)
  gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
  gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0))
  gl.uniform1i(vorticityProgram.uniforms.uCurl, curlFBO.attach(1))
  gl.uniform1f(vorticityProgram.uniforms.curl, props.curl)
  gl.uniform1f(vorticityProgram.uniforms.dt, dt)
  blit(velocity.write)
  velocity.swap()

  // Divergence
  gl.useProgram(divergenceProgram.program)
  gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
  gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0))
  blit(divergenceFBO)

  // Clear pressure
  gl.useProgram(clearProgram.program)
  gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0))
  gl.uniform1f(clearProgram.uniforms.value, props.pressure)
  blit(pressure.write)
  pressure.swap()

  // Pressure iterations
  gl.useProgram(pressureProgram.program)
  gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
  gl.uniform1i(pressureProgram.uniforms.uDivergence, divergenceFBO.attach(0))
  for (let i = 0; i < props.pressureIterations; i++) {
    gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1))
    blit(pressure.write)
    pressure.swap()
  }

  // Gradient subtract
  gl.useProgram(gradientSubtractProgram.program)
  gl.uniform2f(gradientSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
  gl.uniform1i(gradientSubtractProgram.uniforms.uPressure, pressure.read.attach(0))
  gl.uniform1i(gradientSubtractProgram.uniforms.uVelocity, velocity.read.attach(1))
  blit(velocity.write)
  velocity.swap()

  // Advection velocity
  gl.useProgram(advectionProgram.program)
  gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
  gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0))
  gl.uniform1i(advectionProgram.uniforms.uSource, velocity.read.attach(0))
  gl.uniform1f(advectionProgram.uniforms.dt, dt)
  gl.uniform1f(advectionProgram.uniforms.dissipation, props.velocityDissipation)
  blit(velocity.write)
  velocity.swap()

  // Advection dye
  gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0))
  gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1))
  gl.uniform1f(advectionProgram.uniforms.dissipation, props.densityDissipation)
  blit(dye.write)
  dye.swap()
}

function render() {
  if (!gl || !dye || !displayProgram || !blit) return

  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.enable(gl.BLEND)

  gl.useProgram(displayProgram.program)
  gl.uniform2f(displayProgram.uniforms.texelSize, 1 / gl.drawingBufferWidth, 1 / gl.drawingBufferHeight)
  gl.uniform1i(displayProgram.uniforms.uTexture, dye.read.attach(0))
  blit(null)
}

// Accumulated pointer input for frame-limited rendering
let pendingSplat = false
let pendingSplatX = 0
let pendingSplatY = 0
let pendingSplatDx = 0
let pendingSplatDy = 0

function updateFrame(timestamp: number = 0) {
  // Don't animate if reduced motion is preferred or shouldn't animate
  if (!gl || !isVisible || prefersReducedMotion || !shouldAnimate) {
    animationId = requestAnimationFrame(updateFrame)
    return
  }

  // Always capture pointer input at 60fps to avoid losing mouse movements
  if (pointer.moved) {
    pointer.moved = false
    pendingSplat = true
    pendingSplatX = pointer.texcoordX
    pendingSplatY = pointer.texcoordY
    pendingSplatDx = pointer.deltaX * props.splatForce
    pendingSplatDy = pointer.deltaY * props.splatForce
    lastPointerMoveTime = timestamp // Reset idle timer
  }

  // Check for idle state - stop simulation loop after IDLE_TIMEOUT
  // Keep the last frame visible (don't clear) by just stopping the loop
  const timeSincePointerMove = timestamp - lastPointerMoveTime
  if (timeSincePointerMove > IDLE_TIMEOUT && !pendingSplat) {
    isIdle = true
    animationId = null
    // Don't render() here - keep the last frame visible
    return
  }

  animationId = requestAnimationFrame(updateFrame)

  // Frame rate limiting - skip rendering if not enough time has passed
  const elapsed = timestamp - lastRenderTime
  if (elapsed < FRAME_TIME) return
  lastRenderTime = timestamp - (elapsed % FRAME_TIME)

  const now = performance.now()
  let dt = (now - lastTime) / 1000
  dt = Math.min(dt, 0.016666)
  lastTime = now

  // Handle resize
  if (needsResize) {
    needsResize = false
    if (resizeCanvas()) {
      initFramebuffers()
    }
  }

  // Update colors
  colorUpdateTimer += dt * props.colorUpdateSpeed
  if (colorUpdateTimer >= 1) {
    colorUpdateTimer = 0
    pointer.color = generateColor()
  }

  // Apply accumulated pointer input
  if (pendingSplat) {
    pendingSplat = false
    splat(pendingSplatX, pendingSplatY, pendingSplatDx, pendingSplatDy, pointer.color)
  }

  step(dt)
  render()
}

// Wake up from idle when pointer moves
function wakeFromIdle() {
  lastPointerMoveTime = performance.now()
  if (isIdle && animationId === null && shouldAnimate && !prefersReducedMotion) {
    isIdle = false
    updateFrame()
  }
}

function scaleByPixelRatio(value: number) {
  return Math.floor(value * Math.min(window.devicePixelRatio || 1, 2))
}

function updatePointerMoveData(posX: number, posY: number) {
  const canvas = canvasRef.value
  if (!canvas) return

  pointer.prevTexcoordX = pointer.texcoordX
  pointer.prevTexcoordY = pointer.texcoordY
  pointer.texcoordX = posX / canvas.width
  pointer.texcoordY = 1 - posY / canvas.height

  const aspectRatio = canvas.width / canvas.height
  pointer.deltaX = (pointer.texcoordX - pointer.prevTexcoordX) * (aspectRatio < 1 ? aspectRatio : 1)
  pointer.deltaY = (pointer.texcoordY - pointer.prevTexcoordY) / (aspectRatio > 1 ? aspectRatio : 1)
  pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0
}

function updatePointerDownData(posX: number, posY: number) {
  const canvas = canvasRef.value
  if (!canvas) return

  pointer.down = true
  pointer.moved = false
  pointer.texcoordX = posX / canvas.width
  pointer.texcoordY = 1 - posY / canvas.height
  pointer.prevTexcoordX = pointer.texcoordX
  pointer.prevTexcoordY = pointer.texcoordY
  pointer.deltaX = 0
  pointer.deltaY = 0
  pointer.color = generateColor()
}

// ============================================
// EVENT HANDLERS
// ============================================

function handleMouseMove(e: MouseEvent) {
  wakeFromIdle() // Wake up animation on pointer move
  const posX = scaleByPixelRatio(e.clientX)
  const posY = scaleByPixelRatio(e.clientY)
  updatePointerMoveData(posX, posY)
}

function handleMouseDown(e: MouseEvent) {
  wakeFromIdle() // Wake up animation on click
  const posX = scaleByPixelRatio(e.clientX)
  const posY = scaleByPixelRatio(e.clientY)
  updatePointerDownData(posX, posY)

  // Create splash on click
  const color = generateColor()
  color.r *= 10
  color.g *= 10
  color.b *= 10
  splat(pointer.texcoordX, pointer.texcoordY, 10 * (Math.random() - 0.5), 30 * (Math.random() - 0.5), color)
}

function handleTouchStart(e: TouchEvent) {
  wakeFromIdle() // Wake up animation on touch
  const touch = e.touches[0]
  if (!touch) return
  const posX = scaleByPixelRatio(touch.clientX)
  const posY = scaleByPixelRatio(touch.clientY)
  updatePointerDownData(posX, posY)
}

function handleTouchMove(e: TouchEvent) {
  wakeFromIdle() // Wake up animation on touch move
  const touch = e.touches[0]
  if (!touch) return
  const posX = scaleByPixelRatio(touch.clientX)
  const posY = scaleByPixelRatio(touch.clientY)
  updatePointerMoveData(posX, posY)
}

function handleTouchEnd() {
  pointer.down = false
}

function handleResize() {
  needsResize = true
}

function handleVisibilityChange() {
  isVisible = !document.hidden
  if (isVisible) {
    lastTime = performance.now()
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
      updateFrame()
    }
  }
}

function cleanup() {
  // Cancel animation
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }

  // Remove event listeners
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mousedown', handleMouseDown)
  window.removeEventListener('touchstart', handleTouchStart)
  window.removeEventListener('touchmove', handleTouchMove)
  window.removeEventListener('touchend', handleTouchEnd)
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('visibilitychange', handleVisibilityChange)

  // Clean up reduced motion listener
  if (reducedMotionQuery) {
    reducedMotionQuery.removeEventListener('change', handleReducedMotionChange)
    reducedMotionQuery = null
  }

  // Clean up WebGL resources
  if (gl) {
    // Delete framebuffers
    for (const fbo of allFramebuffers) {
      gl.deleteFramebuffer(fbo)
    }
    allFramebuffers = []

    // Delete textures
    for (const tex of allTextures) {
      gl.deleteTexture(tex)
    }
    allTextures = []

    // Delete programs
    for (const prog of allPrograms) {
      gl.deleteProgram(prog)
    }
    allPrograms = []

    // Delete shaders
    for (const shader of allShaders) {
      gl.deleteShader(shader)
    }
    allShaders = []

    // Delete buffers
    if (vertexBuffer) {
      gl.deleteBuffer(vertexBuffer)
      vertexBuffer = null
    }
    if (indexBuffer) {
      gl.deleteBuffer(indexBuffer)
      indexBuffer = null
    }
  }

  gl = null
  ext = null
  blit = null
  dye = null
  velocity = null
  divergenceFBO = null
  curlFBO = null
  pressure = null
  copyProgram = null
  clearProgram = null
  splatProgram = null
  advectionProgram = null
  divergenceProgram = null
  curlProgram = null
  vorticityProgram = null
  pressureProgram = null
  gradientSubtractProgram = null
  displayProgram = null
}

// ============================================
// LIFECYCLE
// ============================================

onMounted(() => {
  if (typeof window === 'undefined') return

  // Detect mobile and low-end device
  isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const nav = navigator as Navigator & { deviceMemory?: number }
  isLowEndDevice = (nav.deviceMemory !== undefined && nav.deviceMemory < 4)

  // Adjust resolutions based on device capability
  // Low-end devices get lower resolutions for better performance
  if (isLowEndDevice || isMobile) {
    effectiveSimResolution = Math.min(props.simResolution, 64)
    effectiveDyeResolution = Math.min(props.dyeResolution, 512)
  } else {
    effectiveSimResolution = props.simResolution
    effectiveDyeResolution = props.dyeResolution
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
    resizeCanvas()
    initFramebuffers()

    pointer.color = generateColor()
    isReady.value = true
    lastTime = performance.now()
    lastPointerMoveTime = performance.now() // Initialize idle timer

    // Start render loop
    animationId = requestAnimationFrame(updateFrame)

    // Add event listeners
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    window.addEventListener('resize', handleResize, { passive: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }
})

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <div class="splash-cursor-container">
    <canvas
      ref="canvasRef"
      class="splash-cursor-canvas"
      :class="{ ready: isReady }"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.splash-cursor-container {
  position: fixed;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.splash-cursor-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.3s ease-out;
}

.splash-cursor-canvas.ready {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .splash-cursor-container {
    display: none;
  }
}

/* Hide on mobile for performance - touch doesn't work well with cursor effect */
@media (max-width: 768px) {
  .splash-cursor-container {
    display: none;
  }
}
</style>
