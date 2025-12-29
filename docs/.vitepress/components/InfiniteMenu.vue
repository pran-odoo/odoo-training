<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { mat4, quat, vec2, vec3 } from 'gl-matrix'

interface MenuItem {
  text: string
  link: string
  icon?: string
  category: string
}

const props = defineProps<{
  scale?: number
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const activeItem = ref<MenuItem | null>(null)
const isMoving = ref(false)

// Menu items from sidebar - using category colors
const menuItems: MenuItem[] = [
  // Getting Started
  { text: 'What is Odoo?', link: '/what-is-odoo', category: 'Getting Started', icon: '🚀' },
  { text: 'Introduction', link: '/introduction', category: 'Getting Started', icon: '📖' },
  // Core Concepts
  { text: 'Models', link: '/01-models', category: 'Core Concepts', icon: '🏗️' },
  { text: 'Field Types', link: '/02-field-types', category: 'Core Concepts', icon: '📝' },
  { text: 'Relationships', link: '/03-relationships', category: 'Core Concepts', icon: '🔗' },
  { text: 'Storage', link: '/04-storage', category: 'Core Concepts', icon: '💾' },
  { text: 'Computed', link: '/05-computed', category: 'Core Concepts', icon: '⚡' },
  { text: 'Related', link: '/06-related', category: 'Core Concepts', icon: '🔄' },
  { text: 'Group By', link: '/07-groupby', category: 'Core Concepts', icon: '📊' },
  // Views & UI
  { text: 'Views', link: '/08-views', category: 'Views & UI', icon: '👁️' },
  { text: 'Widgets', link: '/09-widgets', category: 'Views & UI', icon: '🧩' },
  { text: 'Domains', link: '/10-domains', category: 'Views & UI', icon: '🔍' },
  { text: 'Properties', link: '/11-field-properties', category: 'Views & UI', icon: '⚙️' },
  // Security & Workflows
  { text: 'Access Rights', link: '/12-access-rights', category: 'Security', icon: '🔐' },
  { text: 'Workflows', link: '/13-workflows', category: 'Security', icon: '🔄' },
  { text: 'Actions', link: '/14-actions', category: 'Security', icon: '▶️' },
  // Advanced
  { text: 'Integration', link: '/15-integration', category: 'Advanced', icon: '🔌' },
  { text: 'Studio', link: '/16-studio', category: 'Advanced', icon: '🎨' },
  { text: 'Performance', link: '/17-performance', category: 'Advanced', icon: '🚀' },
  { text: 'Decision', link: '/18-decision-matrix', category: 'Advanced', icon: '📋' },
  { text: 'Examples', link: '/19-examples', category: 'Advanced', icon: '💼' },
  { text: 'Mistakes', link: '/20-mistakes', category: 'Advanced', icon: '⚠️' },
  // Platform & Tools
  { text: 'Odoo.sh', link: '/21-odoosh', category: 'Platform', icon: '☁️' },
  { text: 'Chatter', link: '/22-chatter', category: 'Platform', icon: '💬' },
  { text: 'Email', link: '/23-email', category: 'Platform', icon: '📧' },
  { text: 'Context', link: '/24-context', category: 'Platform', icon: '🎯' },
  { text: 'Constraints', link: '/25-constraints', category: 'Platform', icon: '🚧' },
  { text: 'AI', link: '/26-ai', category: 'Platform', icon: '🤖' },
  { text: 'EDI', link: '/27-edi', category: 'Platform', icon: '📦' },
  // Inventory & Stock
  { text: 'Removal', link: '/28-removal-strategies', category: 'Inventory', icon: '📤' },
]

// Category colors
const categoryColors: Record<string, string> = {
  'Getting Started': '#10b981',
  'Core Concepts': '#6366f1',
  'Views & UI': '#f59e0b',
  'Security': '#ef4444',
  'Advanced': '#8b5cf6',
  'Platform': '#06b6d4',
  'Inventory': '#f97316',
}

const activeCategory = computed(() => activeItem.value?.category || '')
const activeCategoryColor = computed(() => categoryColors[activeCategory.value] || '#6366f1')

// WebGL Shaders with electric glow
const discVertShaderSource = `#version 300 es
uniform mat4 uWorldMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPosition;
uniform vec4 uRotationAxisVelocity;
uniform float uTime;

in vec3 aModelPosition;
in vec3 aModelNormal;
in vec2 aModelUvs;
in mat4 aInstanceMatrix;

out vec2 vUvs;
out float vAlpha;
out vec3 vWorldPos;
flat out int vInstanceId;

void main() {
    vec4 worldPosition = uWorldMatrix * aInstanceMatrix * vec4(aModelPosition, 1.);
    vec3 centerPos = (uWorldMatrix * aInstanceMatrix * vec4(0., 0., 0., 1.)).xyz;
    float radius = length(centerPos.xyz);

    if (gl_VertexID > 0) {
        vec3 rotationAxis = uRotationAxisVelocity.xyz;
        float rotationVelocity = min(.15, uRotationAxisVelocity.w * 15.);
        vec3 stretchDir = normalize(cross(centerPos, rotationAxis));
        vec3 relativeVertexPos = normalize(worldPosition.xyz - centerPos);
        float strength = dot(stretchDir, relativeVertexPos);
        float invAbsStrength = min(0., abs(strength) - 1.);
        strength = rotationVelocity * sign(strength) * abs(invAbsStrength * invAbsStrength * invAbsStrength + 1.);
        worldPosition.xyz += stretchDir * strength;
    }

    worldPosition.xyz = radius * normalize(worldPosition.xyz);
    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;

    vAlpha = smoothstep(0.5, 1., normalize(worldPosition.xyz).z) * .9 + .1;
    vUvs = aModelUvs;
    vWorldPos = worldPosition.xyz;
    vInstanceId = gl_InstanceID;
}
`

const discFragShaderSource = `#version 300 es
precision highp float;

uniform int uItemCount;
uniform vec3 uCategoryColors[10];
uniform int uCategoryIndices[42];
uniform float uTime;

out vec4 outColor;

in vec2 vUvs;
in float vAlpha;
in vec3 vWorldPos;
flat in int vInstanceId;

void main() {
    int itemIndex = vInstanceId % uItemCount;
    int categoryIndex = uCategoryIndices[itemIndex];
    vec3 baseColor = uCategoryColors[categoryIndex];

    vec2 centered = vUvs * 2.0 - 1.0;
    float dist = length(centered);

    if (dist > 1.0) {
        discard;
    }

    // Inner disc with gradient
    float gradient = 1.0 - dist * 0.4;
    vec3 color = baseColor * gradient * 0.8;

    // Electric pulse effect
    float pulse = sin(uTime * 4.0 + float(vInstanceId) * 0.5) * 0.5 + 0.5;

    // Glowing edge
    float edgeGlow = smoothstep(0.7, 0.95, dist);
    color += baseColor * edgeGlow * pulse * 1.5;

    // Sharp bright edge
    float sharpEdge = smoothstep(0.9, 0.98, dist) * (1.0 - smoothstep(0.98, 1.0, dist));
    color += vec3(1.0) * sharpEdge * 0.8;

    outColor = vec4(color, vAlpha);
}
`

// Geometry classes
class Face {
  constructor(public a: number, public b: number, public c: number) {}
}

class Vertex {
  position: vec3
  normal: vec3
  uv: vec2

  constructor(x: number, y: number, z: number) {
    this.position = vec3.fromValues(x, y, z)
    this.normal = vec3.create()
    this.uv = vec2.create()
  }
}

class Geometry {
  vertices: Vertex[] = []
  faces: Face[] = []

  addVertex(...args: number[]): this {
    for (let i = 0; i < args.length; i += 3) {
      this.vertices.push(new Vertex(args[i], args[i + 1], args[i + 2]))
    }
    return this
  }

  addFace(...args: number[]): this {
    for (let i = 0; i < args.length; i += 3) {
      this.faces.push(new Face(args[i], args[i + 1], args[i + 2]))
    }
    return this
  }

  get lastVertex(): Vertex {
    return this.vertices[this.vertices.length - 1]
  }

  subdivide(divisions = 1): this {
    const midPointCache: Record<string, number> = {}
    let f = this.faces

    for (let div = 0; div < divisions; ++div) {
      const newFaces = new Array<Face>(f.length * 4)

      f.forEach((face, ndx) => {
        const mAB = this.getMidPoint(face.a, face.b, midPointCache)
        const mBC = this.getMidPoint(face.b, face.c, midPointCache)
        const mCA = this.getMidPoint(face.c, face.a, midPointCache)

        const i = ndx * 4
        newFaces[i + 0] = new Face(face.a, mAB, mCA)
        newFaces[i + 1] = new Face(face.b, mBC, mAB)
        newFaces[i + 2] = new Face(face.c, mCA, mBC)
        newFaces[i + 3] = new Face(mAB, mBC, mCA)
      })

      f = newFaces
    }

    this.faces = f
    return this
  }

  spherize(radius = 1): this {
    this.vertices.forEach(vertex => {
      vec3.normalize(vertex.normal, vertex.position)
      vec3.scale(vertex.position, vertex.normal, radius)
    })
    return this
  }

  get vertexData(): Float32Array {
    return new Float32Array(this.vertices.flatMap(v => Array.from(v.position)))
  }

  get normalData(): Float32Array {
    return new Float32Array(this.vertices.flatMap(v => Array.from(v.normal)))
  }

  get uvData(): Float32Array {
    return new Float32Array(this.vertices.flatMap(v => Array.from(v.uv)))
  }

  get indexData(): Uint16Array {
    return new Uint16Array(this.faces.flatMap(f => [f.a, f.b, f.c]))
  }

  getMidPoint(ndxA: number, ndxB: number, cache: Record<string, number>): number {
    const cacheKey = ndxA < ndxB ? `k_${ndxB}_${ndxA}` : `k_${ndxA}_${ndxB}`
    if (Object.prototype.hasOwnProperty.call(cache, cacheKey)) {
      return cache[cacheKey]
    }
    const a = this.vertices[ndxA].position
    const b = this.vertices[ndxB].position
    const ndx = this.vertices.length
    cache[cacheKey] = ndx
    this.addVertex((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5)
    return ndx
  }
}

class IcosahedronGeometry extends Geometry {
  constructor() {
    super()
    const t = Math.sqrt(5) * 0.5 + 0.5
    this.addVertex(
      -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0,
      0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t,
      t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1
    ).addFace(
      0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11,
      1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
      3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9,
      4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1
    )
  }
}

class DiscGeometry extends Geometry {
  constructor(steps = 4, radius = 1) {
    super()
    const safeSteps = Math.max(4, steps)
    const alpha = (2 * Math.PI) / safeSteps

    this.addVertex(0, 0, 0)
    this.lastVertex.uv[0] = 0.5
    this.lastVertex.uv[1] = 0.5

    for (let i = 0; i < safeSteps; ++i) {
      const x = Math.cos(alpha * i)
      const y = Math.sin(alpha * i)
      this.addVertex(radius * x, radius * y, 0)
      this.lastVertex.uv[0] = x * 0.5 + 0.5
      this.lastVertex.uv[1] = y * 0.5 + 0.5

      if (i > 0) {
        this.addFace(0, i, i + 1)
      }
    }
    this.addFace(0, safeSteps, 1)
  }
}

// WebGL helpers
function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return shader
  }
  console.error(gl.getShaderInfoLog(shader))
  gl.deleteShader(shader)
  return null
}

function createProgram(
  gl: WebGL2RenderingContext,
  shaderSources: [string, string],
  attribLocations?: Record<string, number>
): WebGLProgram | null {
  const program = gl.createProgram()
  if (!program) return null

  ;[gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].forEach((type, ndx) => {
    const shader = createShader(gl, type, shaderSources[ndx])
    if (shader) {
      gl.attachShader(program, shader)
    }
  })

  if (attribLocations) {
    for (const attrib in attribLocations) {
      gl.bindAttribLocation(program, attribLocations[attrib], attrib)
    }
  }

  gl.linkProgram(program)
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return program
  }
  console.error(gl.getProgramInfoLog(program))
  gl.deleteProgram(program)
  return null
}

function makeBuffer(gl: WebGL2RenderingContext, data: ArrayBufferView, usage: number): WebGLBuffer {
  const buf = gl.createBuffer()
  if (!buf) throw new Error('Failed to create buffer')
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, data, usage)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  return buf
}

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): boolean {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const displayWidth = Math.round(canvas.clientWidth * dpr)
  const displayHeight = Math.round(canvas.clientHeight * dpr)
  const needResize = canvas.width !== displayWidth || canvas.height !== displayHeight
  if (needResize) {
    canvas.width = displayWidth
    canvas.height = displayHeight
  }
  return needResize
}

// Arcball Control
class ArcballControl {
  isPointerDown = false
  orientation = quat.create()
  pointerRotation = quat.create()
  rotationVelocity = 0
  rotationAxis = vec3.fromValues(1, 0, 0)
  snapDirection = vec3.fromValues(0, 0, -1)
  snapTargetDirection: vec3 | null = null

  private pointerPos = vec2.create()
  private previousPointerPos = vec2.create()
  private _rotationVelocity = 0
  private _combinedQuat = quat.create()
  private readonly EPSILON = 0.1
  private readonly IDENTITY_QUAT = quat.create()

  constructor(private canvas: HTMLCanvasElement, private updateCallback: (dt: number) => void) {
    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      vec2.set(this.pointerPos, e.clientX, e.clientY)
      vec2.copy(this.previousPointerPos, this.pointerPos)
      this.isPointerDown = true
    })
    canvas.addEventListener('pointerup', () => { this.isPointerDown = false })
    canvas.addEventListener('pointerleave', () => { this.isPointerDown = false })
    canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.isPointerDown) {
        vec2.set(this.pointerPos, e.clientX, e.clientY)
      }
    })
    canvas.style.touchAction = 'none'
  }

  update(deltaTime: number, targetFrameDuration = 16): void {
    const timeScale = deltaTime / targetFrameDuration + 0.00001
    let angleFactor = timeScale
    const snapRotation = quat.create()

    if (this.isPointerDown) {
      const INTENSITY = 0.3 * timeScale
      const ANGLE_AMPLIFICATION = 5 / timeScale
      const midPointerPos = vec2.sub(vec2.create(), this.pointerPos, this.previousPointerPos)
      vec2.scale(midPointerPos, midPointerPos, INTENSITY)

      if (vec2.sqrLen(midPointerPos) > this.EPSILON) {
        vec2.add(midPointerPos, this.previousPointerPos, midPointerPos)
        const p = this.project(midPointerPos)
        const q = this.project(this.previousPointerPos)
        const a = vec3.normalize(vec3.create(), p)
        const b = vec3.normalize(vec3.create(), q)
        vec2.copy(this.previousPointerPos, midPointerPos)
        angleFactor *= ANGLE_AMPLIFICATION
        this.quatFromVectors(a, b, this.pointerRotation, angleFactor)
      } else {
        quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, INTENSITY)
      }
    } else {
      const INTENSITY = 0.1 * timeScale
      quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, INTENSITY)

      if (this.snapTargetDirection) {
        const SNAPPING_INTENSITY = 0.2
        const a = this.snapTargetDirection
        const b = this.snapDirection
        const sqrDist = vec3.squaredDistance(a, b)
        const distanceFactor = Math.max(0.1, 1 - sqrDist * 10)
        angleFactor *= SNAPPING_INTENSITY * distanceFactor
        this.quatFromVectors(a, b, snapRotation, angleFactor)
      }
    }

    const combinedQuat = quat.multiply(quat.create(), snapRotation, this.pointerRotation)
    this.orientation = quat.multiply(quat.create(), combinedQuat, this.orientation)
    quat.normalize(this.orientation, this.orientation)

    const RA_INTENSITY = 0.8 * timeScale
    quat.slerp(this._combinedQuat, this._combinedQuat, combinedQuat, RA_INTENSITY)
    quat.normalize(this._combinedQuat, this._combinedQuat)

    const rad = Math.acos(this._combinedQuat[3]) * 2.0
    const s = Math.sin(rad / 2.0)
    let rv = 0
    if (s > 0.000001) {
      rv = rad / (2 * Math.PI)
      this.rotationAxis[0] = this._combinedQuat[0] / s
      this.rotationAxis[1] = this._combinedQuat[1] / s
      this.rotationAxis[2] = this._combinedQuat[2] / s
    }

    const RV_INTENSITY = 0.5 * timeScale
    this._rotationVelocity += (rv - this._rotationVelocity) * RV_INTENSITY
    this.rotationVelocity = this._rotationVelocity / timeScale

    this.updateCallback(deltaTime)
  }

  private quatFromVectors(a: vec3, b: vec3, out: quat, angleFactor = 1): void {
    const axis = vec3.cross(vec3.create(), a, b)
    vec3.normalize(axis, axis)
    const d = Math.max(-1, Math.min(1, vec3.dot(a, b)))
    const angle = Math.acos(d) * angleFactor
    quat.setAxisAngle(out, axis, angle)
  }

  private project(pos: vec2): vec3 {
    const r = 2
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    const s = Math.max(w, h) - 1
    const x = (2 * pos[0] - w - 1) / s
    const y = (2 * pos[1] - h - 1) / s
    let z = 0
    const xySq = x * x + y * y
    const rSq = r * r

    if (xySq <= rSq / 2.0) {
      z = Math.sqrt(rSq - xySq)
    } else {
      z = rSq / Math.sqrt(xySq)
    }
    return vec3.fromValues(-x, y, z)
  }
}

// Main WebGL class
let gl: WebGL2RenderingContext | null = null
let discProgram: WebGLProgram | null = null
let discVAO: WebGLVertexArrayObject | null = null
let control: ArcballControl | null = null
let animationId: number | null = null

const worldMatrix = mat4.create()
const camera = {
  matrix: mat4.create(),
  near: 0.1,
  far: 40,
  fov: Math.PI / 4,
  aspect: 1,
  position: vec3.fromValues(0, 0, 3),
  up: vec3.fromValues(0, 1, 0),
  matrices: {
    view: mat4.create(),
    projection: mat4.create(),
  }
}

let discInstances: {
  matricesArray: Float32Array
  matrices: Float32Array[]
  buffer: WebGLBuffer | null
}

let instancePositions: vec3[] = []
let DISC_INSTANCE_COUNT = 0
let discBuffers: { vertices: Float32Array; indices: Uint16Array; uvs: Float32Array }
let smoothRotationVelocity = 0
const TARGET_FRAME_DURATION = 1000 / 60
const SPHERE_RADIUS = 2
let scaleFactor = 1.0
let _time = 0
let _frames = 0
let movementActive = false

let discLocations: {
  aModelPosition: number
  aModelUvs: number
  aInstanceMatrix: number
  uWorldMatrix: WebGLUniformLocation | null
  uViewMatrix: WebGLUniformLocation | null
  uProjectionMatrix: WebGLUniformLocation | null
  uCameraPosition: WebGLUniformLocation | null
  uRotationAxisVelocity: WebGLUniformLocation | null
  uItemCount: WebGLUniformLocation | null
  uCategoryColors: WebGLUniformLocation | null
  uCategoryIndices: WebGLUniformLocation | null
  uTime: WebGLUniformLocation | null
}

function initWebGL(canvas: HTMLCanvasElement) {
  gl = canvas.getContext('webgl2', { antialias: true, alpha: true })
  if (!gl) throw new Error('No WebGL 2 context!')

  scaleFactor = props.scale || 1.0
  camera.position[2] = 3 * scaleFactor

  discProgram = createProgram(gl, [discVertShaderSource, discFragShaderSource], {
    aModelPosition: 0,
    aModelNormal: 1,
    aModelUvs: 2,
    aInstanceMatrix: 3
  })

  if (!discProgram) throw new Error('Failed to create program')

  discLocations = {
    aModelPosition: gl.getAttribLocation(discProgram, 'aModelPosition'),
    aModelUvs: gl.getAttribLocation(discProgram, 'aModelUvs'),
    aInstanceMatrix: gl.getAttribLocation(discProgram, 'aInstanceMatrix'),
    uWorldMatrix: gl.getUniformLocation(discProgram, 'uWorldMatrix'),
    uViewMatrix: gl.getUniformLocation(discProgram, 'uViewMatrix'),
    uProjectionMatrix: gl.getUniformLocation(discProgram, 'uProjectionMatrix'),
    uCameraPosition: gl.getUniformLocation(discProgram, 'uCameraPosition'),
    uRotationAxisVelocity: gl.getUniformLocation(discProgram, 'uRotationAxisVelocity'),
    uItemCount: gl.getUniformLocation(discProgram, 'uItemCount'),
    uCategoryColors: gl.getUniformLocation(discProgram, 'uCategoryColors'),
    uCategoryIndices: gl.getUniformLocation(discProgram, 'uCategoryIndices'),
    uTime: gl.getUniformLocation(discProgram, 'uTime'),
  }

  const discGeo = new DiscGeometry(56, 1)
  discBuffers = {
    vertices: discGeo.vertexData,
    indices: discGeo.indexData,
    uvs: discGeo.uvData,
  }

  discVAO = gl.createVertexArray()
  gl.bindVertexArray(discVAO)

  const vertexBuffer = makeBuffer(gl, discBuffers.vertices, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
  gl.enableVertexAttribArray(discLocations.aModelPosition)
  gl.vertexAttribPointer(discLocations.aModelPosition, 3, gl.FLOAT, false, 0, 0)

  const uvBuffer = makeBuffer(gl, discBuffers.uvs, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer)
  gl.enableVertexAttribArray(discLocations.aModelUvs)
  gl.vertexAttribPointer(discLocations.aModelUvs, 2, gl.FLOAT, false, 0, 0)

  const indexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, discBuffers.indices, gl.STATIC_DRAW)

  gl.bindVertexArray(null)

  const icoGeo = new IcosahedronGeometry()
  icoGeo.subdivide(1).spherize(SPHERE_RADIUS)
  instancePositions = icoGeo.vertices.map(v => v.position)
  DISC_INSTANCE_COUNT = icoGeo.vertices.length

  initDiscInstances(DISC_INSTANCE_COUNT)

  control = new ArcballControl(canvas, onControlUpdate)

  updateCameraMatrix()
  updateProjectionMatrix()
  resize()
}

function initDiscInstances(count: number) {
  if (!gl || !discVAO) return

  const matricesArray = new Float32Array(count * 16)
  const matrices: Float32Array[] = []
  for (let i = 0; i < count; ++i) {
    const instanceMatrixArray = new Float32Array(matricesArray.buffer, i * 16 * 4, 16)
    mat4.identity(instanceMatrixArray as unknown as mat4)
    matrices.push(instanceMatrixArray)
  }

  discInstances = {
    matricesArray,
    matrices,
    buffer: gl.createBuffer()
  }

  gl.bindVertexArray(discVAO)
  gl.bindBuffer(gl.ARRAY_BUFFER, discInstances.buffer)
  gl.bufferData(gl.ARRAY_BUFFER, discInstances.matricesArray.byteLength, gl.DYNAMIC_DRAW)

  const mat4AttribSlotCount = 4
  const bytesPerMatrix = 16 * 4
  for (let j = 0; j < mat4AttribSlotCount; ++j) {
    const loc = discLocations.aInstanceMatrix + j
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, bytesPerMatrix, j * 4 * 4)
    gl.vertexAttribDivisor(loc, 1)
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  gl.bindVertexArray(null)
}

function resize() {
  if (!canvasRef.value || !gl) return
  resizeCanvasToDisplaySize(canvasRef.value)
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
  updateProjectionMatrix()
}

function updateCameraMatrix() {
  mat4.targetTo(camera.matrix, camera.position, [0, 0, 0], camera.up)
  mat4.invert(camera.matrices.view, camera.matrix)
}

function updateProjectionMatrix() {
  if (!gl) return
  const canvas = gl.canvas as HTMLCanvasElement
  camera.aspect = canvas.clientWidth / canvas.clientHeight
  const height = SPHERE_RADIUS * 0.35
  const distance = camera.position[2]
  if (camera.aspect > 1) {
    camera.fov = 2 * Math.atan(height / distance)
  } else {
    camera.fov = 2 * Math.atan(height / camera.aspect / distance)
  }
  mat4.perspective(camera.matrices.projection, camera.fov, camera.aspect, camera.near, camera.far)
}

function onControlUpdate(deltaTime: number) {
  if (!control) return
  const timeScale = deltaTime / TARGET_FRAME_DURATION + 0.0001
  let damping = 5 / timeScale
  let cameraTargetZ = 3 * scaleFactor

  const isCurrentlyMoving = control.isPointerDown || Math.abs(smoothRotationVelocity) > 0.01

  if (isCurrentlyMoving !== movementActive) {
    movementActive = isCurrentlyMoving
    isMoving.value = isCurrentlyMoving
  }

  if (!control.isPointerDown) {
    const nearestVertexIndex = findNearestVertexIndex()
    const itemIndex = nearestVertexIndex % Math.max(1, menuItems.length)
    activeItem.value = menuItems[itemIndex]
    const snapDirection = vec3.normalize(vec3.create(), getVertexWorldPosition(nearestVertexIndex))
    control.snapTargetDirection = snapDirection
  } else {
    cameraTargetZ += control.rotationVelocity * 80 + 2.5
    damping = 7 / timeScale
  }

  camera.position[2] += (cameraTargetZ - camera.position[2]) / damping
  updateCameraMatrix()
}

function findNearestVertexIndex(): number {
  if (!control) return 0
  const n = control.snapDirection
  const inversOrientation = quat.conjugate(quat.create(), control.orientation)
  const nt = vec3.transformQuat(vec3.create(), n, inversOrientation)

  let maxD = -1
  let nearestVertexIndex = 0
  for (let i = 0; i < instancePositions.length; ++i) {
    const d = vec3.dot(nt, instancePositions[i])
    if (d > maxD) {
      maxD = d
      nearestVertexIndex = i
    }
  }
  return nearestVertexIndex
}

function getVertexWorldPosition(index: number): vec3 {
  if (!control) return vec3.create()
  const nearestVertexPos = instancePositions[index]
  return vec3.transformQuat(vec3.create(), nearestVertexPos, control.orientation)
}

function animate(deltaTime: number) {
  if (!gl || !control) return

  control.update(deltaTime, TARGET_FRAME_DURATION)

  const positions = instancePositions.map(p => vec3.transformQuat(vec3.create(), p, control!.orientation))
  const scale = 0.25
  const SCALE_INTENSITY = 0.6

  positions.forEach((p, ndx) => {
    const s = (Math.abs(p[2]) / SPHERE_RADIUS) * SCALE_INTENSITY + (1 - SCALE_INTENSITY)
    const finalScale = s * scale
    const matrix = mat4.create()

    mat4.multiply(matrix, matrix, mat4.fromTranslation(mat4.create(), vec3.negate(vec3.create(), p)))
    mat4.multiply(matrix, matrix, mat4.targetTo(mat4.create(), [0, 0, 0], p, [0, 1, 0]))
    mat4.multiply(matrix, matrix, mat4.fromScaling(mat4.create(), [finalScale, finalScale, finalScale]))
    mat4.multiply(matrix, matrix, mat4.fromTranslation(mat4.create(), [0, 0, -SPHERE_RADIUS]))

    mat4.copy(discInstances.matrices[ndx], matrix)
  })

  gl.bindBuffer(gl.ARRAY_BUFFER, discInstances.buffer)
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, discInstances.matricesArray)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)

  smoothRotationVelocity = control.rotationVelocity
}

function render() {
  if (!gl || !discProgram) return

  gl.useProgram(discProgram)
  gl.enable(gl.CULL_FACE)
  gl.enable(gl.DEPTH_TEST)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  gl.uniformMatrix4fv(discLocations.uWorldMatrix, false, worldMatrix)
  gl.uniformMatrix4fv(discLocations.uViewMatrix, false, camera.matrices.view)
  gl.uniformMatrix4fv(discLocations.uProjectionMatrix, false, camera.matrices.projection)
  gl.uniform3f(discLocations.uCameraPosition, camera.position[0], camera.position[1], camera.position[2])
  gl.uniform4f(
    discLocations.uRotationAxisVelocity,
    control?.rotationAxis[0] || 0,
    control?.rotationAxis[1] || 0,
    control?.rotationAxis[2] || 0,
    smoothRotationVelocity * 1.1
  )

  gl.uniform1i(discLocations.uItemCount, menuItems.length)
  gl.uniform1f(discLocations.uTime, _frames * 0.016)

  // Category colors as vec3 array
  const categoryList = Object.keys(categoryColors)
  const colorArray = new Float32Array(30)
  categoryList.forEach((cat, i) => {
    const hex = categoryColors[cat]
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    colorArray[i * 3] = r
    colorArray[i * 3 + 1] = g
    colorArray[i * 3 + 2] = b
  })
  gl.uniform3fv(discLocations.uCategoryColors, colorArray)

  // Category indices for each menu item
  const categoryIndices = new Int32Array(42)
  menuItems.forEach((item, i) => {
    categoryIndices[i] = categoryList.indexOf(item.category)
  })
  gl.uniform1iv(discLocations.uCategoryIndices, categoryIndices)

  gl.bindVertexArray(discVAO)
  gl.drawElementsInstanced(gl.TRIANGLES, discBuffers.indices.length, gl.UNSIGNED_SHORT, 0, DISC_INSTANCE_COUNT)
  gl.bindVertexArray(null)
}

function run(time = 0) {
  const deltaTime = Math.min(32, time - _time)
  _time = time
  _frames += deltaTime / TARGET_FRAME_DURATION

  animate(deltaTime)
  render()

  animationId = requestAnimationFrame(run)
}

function handleClick() {
  if (!activeItem.value) return
  window.location.href = `/odoo-training${activeItem.value.link}`
}

onMounted(() => {
  if (canvasRef.value) {
    initWebGL(canvasRef.value)
    run()
    window.addEventListener('resize', resize)
  }
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', resize)
})
</script>

<template>
  <div class="infinite-menu-container">
    <canvas
      ref="canvasRef"
      class="infinite-menu-canvas"
    />

    <!-- Large center display showing active topic -->
    <div class="center-label" :class="{ hidden: isMoving }">
      <span class="center-icon">{{ activeItem?.icon }}</span>
      <span class="center-text">{{ activeItem?.text }}</span>
    </div>

    <div v-if="activeItem" class="menu-info" :class="{ hidden: isMoving }">
      <div class="category-badge" :style="{ backgroundColor: activeCategoryColor, boxShadow: `0 0 20px ${activeCategoryColor}` }">
        {{ activeCategory }}
      </div>
      <h3 class="item-title">
        <span class="item-icon">{{ activeItem.icon }}</span>
        <span class="shiny-text">{{ activeItem.text }}</span>
      </h3>
      <button class="go-button" @click="handleClick" :style="{ borderColor: activeCategoryColor, boxShadow: `0 0 15px ${activeCategoryColor}40` }">
        <span>Start Learning</span>
        <span class="arrow">&#x2197;</span>
      </button>
    </div>

    <div class="drag-hint" :class="{ hidden: isMoving }">
      Drag to explore topics
    </div>
  </div>
</template>

<style scoped>
.infinite-menu-container {
  position: relative;
  width: 100%;
  height: 500px;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
}

.infinite-menu-canvas {
  width: 100%;
  height: 100%;
  cursor: grab;
  outline: none;
}

.infinite-menu-canvas:active {
  cursor: grabbing;
}

/* Center label showing current topic */
.center-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
  text-align: center;
  transition: opacity 0.3s ease;
}

.center-label.hidden {
  opacity: 0;
}

.center-icon {
  font-size: 3rem;
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.5));
}

.center-text {
  font-size: 1.2rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 0 20px rgba(0, 0, 0, 0.8), 0 2px 4px rgba(0, 0, 0, 0.5);
  background: linear-gradient(
    120deg,
    rgba(255,255,255,0.9) 0%,
    rgba(255,255,255,1) 50%,
    rgba(255,255,255,0.9) 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  animation: textShine 3s linear infinite;
}

@keyframes textShine {
  0% { background-position: 200% center; }
  100% { background-position: -200% center; }
}

.menu-info {
  position: absolute;
  bottom: 24px;
  left: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.menu-info.hidden {
  opacity: 0;
  transform: translateY(10px);
  pointer-events: none;
}

.category-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  width: fit-content;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.item-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-icon {
  font-size: 1.2rem;
}

.shiny-text {
  background: linear-gradient(
    120deg,
    var(--vp-c-text-1) 0%,
    var(--vp-c-text-1) 35%,
    var(--vp-c-brand-1) 50%,
    var(--vp-c-text-1) 65%,
    var(--vp-c-text-1) 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shine 3s linear infinite;
}

@keyframes shine {
  0% { background-position: 200% center; }
  100% { background-position: -200% center; }
}

.go-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--vp-c-bg);
  border: 2px solid;
  border-radius: 30px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  transition: all 0.2s ease;
  width: fit-content;
}

.go-button:hover {
  transform: scale(1.05);
}

.go-button .arrow {
  font-size: 16px;
}

.drag-hint {
  position: absolute;
  bottom: 24px;
  right: 24px;
  font-size: 12px;
  color: var(--vp-c-text-3);
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.drag-hint.hidden {
  opacity: 0;
}

@media (max-width: 768px) {
  .infinite-menu-container {
    height: 400px;
  }

  .item-title {
    font-size: 1.2rem;
  }

  .menu-info {
    bottom: 16px;
    left: 16px;
  }

  .drag-hint {
    display: none;
  }

  .center-icon {
    font-size: 2rem;
  }

  .center-text {
    font-size: 1rem;
  }
}
</style>
