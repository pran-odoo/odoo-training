<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

// Connection state
const baseUrl = ref('')
const apiKey = ref('')
const showApiKey = ref(false)
const isConnected = ref(false)
const connectionStatus = ref<'idle' | 'testing' | 'success' | 'error'>('idle')
const copyFeedback = ref('')
const useProxy = ref(true) // Default to proxy for Odoo.com compatibility
const isNeutralized = ref<boolean | null>(null) // null = unknown, true = sandbox, false = production
const connectedUserName = ref('') // Name of connected user

// Request state
const selectedCategory = ref('partners')
const selectedTemplate = ref('')
const model = ref('res.partner')
const method = ref('search_read')
const requestBody = ref('{\n  "domain": [],\n  "fields": ["name", "email"],\n  "limit": 5\n}')

// Response state
const isLoading = ref(false)
const response = ref<any>(null)
const responseTime = ref(0)
const responseStatus = ref(0)
const error = ref('')
const showDebugTraceback = ref(false)

// Fun stuff!
const showConfetti = ref(false)
const streak = ref(0)
const bestStreak = ref(0)
const loadingMessage = ref('')
const showSuccessAnimation = ref(false)

// Custom query builder
const customModel = ref('res.partner')
const customMethod = ref('search_read')
const customFields = ref(['name', 'email'])
const customLimit = ref(10)
const customDomain = ref<Array<{ id: number; field: string; operator: string; value: string }>>([])
const customRecordIds = ref('')
let domainFilterId = 0 // Unique ID generator for domain filters

// History
const history = ref<Array<{
  id: number
  model: string
  method: string
  status: number
  time: number
  timestamp: Date
}>>([])

// Stats
const stats = ref({ calls: 0, successful: 0, fastest: 0 })

// Fun loading messages
const loadingMessages = [
  '🚀 Launching request into the cloud...',
  '🔮 Consulting the Odoo Oracle...',
  '⚡ Zapping through the API...',
  '🎯 Targeting the database...',
  '🌊 Surfing the data waves...',
  '🎪 Performing API acrobatics...',
  '🔬 Analyzing your query...',
  '🎨 Painting the response...',
  '🏎️ Racing to fetch data...',
  '🎸 Rocking the API...',
  '🍕 Cooking up some data...',
  '🎮 Level loading...',
  '🦄 Summoning unicorn powers...',
  '🌈 Following the rainbow to data...',
  '🎪 The API circus is in town...'
]

// Common Odoo methods for custom builder
const commonMethods = [
  { id: 'search_read', name: 'Search & Read', icon: '🔍', description: 'Find and retrieve records' },
  { id: 'search_count', name: 'Count Records', icon: '🔢', description: 'Count matching records' },
  { id: 'read', name: 'Read by ID', icon: '📖', description: 'Get records by their IDs' },
  { id: 'create', name: 'Create Record', icon: '➕', description: 'Create a new record' },
  { id: 'write', name: 'Update Record', icon: '✏️', description: 'Modify existing records' },
  { id: 'unlink', name: 'Delete Record', icon: '🗑️', description: 'Remove records' },
  { id: 'name_search', name: 'Name Search', icon: '🏷️', description: 'Search by display name' },
  { id: 'fields_get', name: 'Get Fields', icon: '📋', description: 'Discover model fields' }
]

// Common domain operators
const domainOperators = [
  { value: '=', label: 'equals' },
  { value: '!=', label: 'not equals' },
  { value: '>', label: 'greater than' },
  { value: '>=', label: 'greater or equal' },
  { value: '<', label: 'less than' },
  { value: '<=', label: 'less or equal' },
  { value: 'like', label: 'contains (case sensitive)' },
  { value: 'ilike', label: 'contains' },
  { value: 'in', label: 'in list' },
  { value: 'not in', label: 'not in list' }
]

// Popular Odoo models with verified fields per model
const modelFieldMap: Record<string, { defaults: string[]; quick: string[] }> = {
  'res.partner':       { defaults: ['name', 'email'],           quick: ['id', 'name', 'email', 'phone', 'is_company', 'active'] },
  'res.users':         { defaults: ['name', 'login'],           quick: ['id', 'name', 'login', 'partner_id', 'active'] },
  'product.product':   { defaults: ['name', 'list_price'],      quick: ['id', 'name', 'default_code', 'list_price', 'active'] },
  'product.template':  { defaults: ['name', 'list_price'],      quick: ['id', 'name', 'list_price', 'categ_id', 'active'] },
  'sale.order':        { defaults: ['name', 'partner_id', 'amount_total', 'state'], quick: ['id', 'name', 'partner_id', 'state', 'amount_total'] },
  'sale.order.line':   { defaults: ['order_id', 'product_id', 'product_uom_qty', 'price_subtotal'], quick: ['id', 'order_id', 'product_id', 'product_uom_qty', 'price_unit'] },
  'purchase.order':    { defaults: ['name', 'partner_id', 'amount_total', 'state'], quick: ['id', 'name', 'partner_id', 'state', 'amount_total'] },
  'account.move':      { defaults: ['name', 'partner_id', 'amount_total', 'payment_state'], quick: ['id', 'name', 'partner_id', 'move_type', 'state'] },
  'stock.picking':     { defaults: ['name', 'state', 'partner_id'], quick: ['id', 'name', 'state', 'location_id', 'location_dest_id'] },
  'stock.quant':       { defaults: ['product_id', 'location_id', 'quantity'], quick: ['id', 'product_id', 'location_id', 'quantity', 'lot_id'] },
  'crm.lead':          { defaults: ['name', 'partner_id', 'stage_id'], quick: ['id', 'name', 'partner_id', 'stage_id', 'expected_revenue', 'active'] },
  'project.project':   { defaults: ['name', 'partner_id'],      quick: ['id', 'name', 'partner_id', 'user_id', 'active'] },
  'project.task':      { defaults: ['name', 'project_id', 'stage_id'], quick: ['id', 'name', 'project_id', 'stage_id', 'user_ids', 'active'] }
}

const popularModels = Object.keys(modelFieldMap)

// Get verified quick-field suggestions for the current model
const currentQuickFields = computed(() => {
  const mapping = modelFieldMap[customModel.value]
  return mapping ? mapping.quick : ['id', 'name', 'create_date', 'write_date']
})

// Reset fields to verified defaults when model changes
watch(customModel, (newModel) => {
  const mapping = modelFieldMap[newModel]
  if (mapping) {
    customFields.value = [...mapping.defaults]
  }
  customDomain.value = []
})

// Templates organized by category
const templates = {
  partners: [
    {
      id: 'search-partners',
      name: 'Search Partners',
      icon: '🔍',
      model: 'res.partner',
      method: 'search_read',
      body: {
        domain: [["is_company", "=", true]],
        fields: ["name", "email", "phone", "city"],
        limit: 10
      }
    },
    {
      id: 'create-partner',
      name: 'Create Partner',
      icon: '➕',
      model: 'res.partner',
      method: 'create',
      body: {
        vals_list: {
          name: "New Customer",
          email: "customer@example.com",
          is_company: true
        }
      }
    },
    {
      id: 'update-partner',
      name: 'Update Partner',
      icon: '✏️',
      model: 'res.partner',
      method: 'write',
      body: {
        ids: [1],
        vals: { phone: "+1 555-1234" }
      }
    }
  ],
  products: [
    {
      id: 'search-products',
      name: 'Search Products',
      icon: '📦',
      model: 'product.product',
      method: 'search_read',
      body: {
        domain: [["sale_ok", "=", true]],
        fields: ["name", "default_code", "list_price", "qty_available"],
        limit: 10
      }
    },
    {
      id: 'check-stock',
      name: 'Check Stock',
      icon: '📊',
      model: 'stock.quant',
      method: 'search_read',
      body: {
        domain: [["location_id.usage", "=", "internal"]],
        fields: ["product_id", "location_id", "quantity"],
        limit: 20
      }
    }
  ],
  sales: [
    {
      id: 'search-orders',
      name: 'Search Orders',
      icon: '📋',
      model: 'sale.order',
      method: 'search_read',
      body: {
        domain: [["state", "in", ["draft", "sent"]]],
        fields: ["name", "partner_id", "amount_total", "state"],
        limit: 10
      }
    },
    {
      id: 'create-order',
      name: 'Create Order',
      icon: '🛒',
      model: 'sale.order',
      method: 'create',
      body: {
        vals_list: {
          partner_id: 1,
          order_line: [
            [0, 0, { product_id: 1, product_uom_qty: 2 }]
          ]
        }
      }
    },
    {
      id: 'confirm-order',
      name: 'Confirm Order',
      icon: '✅',
      model: 'sale.order',
      method: 'action_confirm',
      body: { ids: [1] }
    }
  ],
  invoices: [
    {
      id: 'search-invoices',
      name: 'Search Invoices',
      icon: '🧾',
      model: 'account.move',
      method: 'search_read',
      body: {
        domain: [["move_type", "=", "out_invoice"]],
        fields: ["name", "partner_id", "amount_total", "payment_state"],
        limit: 10
      }
    },
    {
      id: 'post-invoice',
      name: 'Post Invoice',
      icon: '📤',
      model: 'account.move',
      method: 'action_post',
      body: { ids: [1] }
    }
  ],
  custom: [] // Will be populated by the custom builder
}

const categories = [
  { id: 'partners', name: 'Partners', icon: '👥' },
  { id: 'products', name: 'Products', icon: '📦' },
  { id: 'sales', name: 'Sales', icon: '🛒' },
  { id: 'invoices', name: 'Invoices', icon: '🧾' },
  { id: 'custom', name: 'Custom Builder', icon: '🛠️' }
]

const currentTemplates = computed(() => templates[selectedCategory.value as keyof typeof templates] || [])

// Convert domain filter value to appropriate type
function coerceDomainValue(value: string, operator: string): any {
  const trimmed = value.trim()

  // Handle 'in' and 'not in' operators - expect comma-separated list
  if (operator === 'in' || operator === 'not in') {
    return trimmed.split(',').map(v => coerceDomainValue(v.trim(), '='))
  }

  // Boolean values
  if (trimmed.toLowerCase() === 'true') return true
  if (trimmed.toLowerCase() === 'false') return false

  // Numeric values (integer or float)
  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10)
  if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed)

  // Default to string
  return trimmed
}

// Build domain array from filter objects
function buildDomainArray(): any[] {
  return customDomain.value.map(f => [
    f.field,
    f.operator,
    coerceDomainValue(f.value, f.operator)
  ])
}

// Build custom request body based on selected method
const customRequestBody = computed(() => {
  const m = customMethod.value
  const limit = Number.isFinite(customLimit.value) && customLimit.value > 0 ? customLimit.value : 10

  if (m === 'search_read') {
    return {
      domain: customDomain.value.length > 0 ? buildDomainArray() : [],
      fields: customFields.value,
      limit
    }
  }

  if (m === 'search_count') {
    return {
      domain: customDomain.value.length > 0 ? buildDomainArray() : []
    }
  }

  if (m === 'read') {
    const ids = customRecordIds.value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    return {
      ids: ids.length > 0 ? ids : [1],
      fields: customFields.value
    }
  }

  if (m === 'create') {
    return {
      vals_list: {
        name: 'New Record'
      }
    }
  }

  if (m === 'write') {
    const ids = customRecordIds.value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    return {
      ids: ids.length > 0 ? ids : [1],
      vals: {}
    }
  }

  if (m === 'unlink') {
    const ids = customRecordIds.value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    return {
      ids: ids.length > 0 ? ids : [1]
    }
  }

  if (m === 'name_search') {
    const limit = Number.isFinite(customLimit.value) && customLimit.value > 0 ? customLimit.value : 10
    return {
      name: '',
      domain: customDomain.value.length > 0 ? buildDomainArray() : [],
      limit
    }
  }

  if (m === 'fields_get') {
    return {
      attributes: ['string', 'type', 'required', 'readonly']
    }
  }

  return {}
})

// Load saved connection from sessionStorage (client-side only)
onMounted(() => {
  if (typeof window === 'undefined') return // SSR guard

  const savedUrl = sessionStorage.getItem('odoo_playground_url')
  const savedKey = sessionStorage.getItem('odoo_playground_key')
  const savedProxy = sessionStorage.getItem('odoo_playground_proxy')
  const savedStreak = sessionStorage.getItem('odoo_playground_best_streak')
  if (savedUrl) baseUrl.value = savedUrl
  if (savedKey) apiKey.value = savedKey
  if (savedProxy !== null) useProxy.value = savedProxy === 'true'
  if (savedStreak) bestStreak.value = parseInt(savedStreak) || 0
  // Don't auto-set isConnected - user must test connection to verify

  // Add keyboard shortcut listener
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('keydown', handleKeydown)
})

// Handle Ctrl+Enter keyboard shortcut
function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (isConnected.value && !isLoading.value) {
      e.preventDefault()
      executeRequest()
    }
  }
}

// Save connection to sessionStorage
watch([baseUrl, apiKey, useProxy], () => {
  if (typeof window === 'undefined') return // SSR guard

  if (baseUrl.value) {
    sessionStorage.setItem('odoo_playground_url', baseUrl.value)
  } else {
    sessionStorage.removeItem('odoo_playground_url')
  }
  if (apiKey.value) {
    sessionStorage.setItem('odoo_playground_key', apiKey.value)
  } else {
    sessionStorage.removeItem('odoo_playground_key')
  }
  sessionStorage.setItem('odoo_playground_proxy', String(useProxy.value))
})

// Save best streak
watch(bestStreak, () => {
  if (typeof window === 'undefined') return
  sessionStorage.setItem('odoo_playground_best_streak', String(bestStreak.value))
})

function selectTemplate(template: typeof templates.partners[0]) {
  selectedTemplate.value = template.id
  model.value = template.model
  method.value = template.method
  requestBody.value = JSON.stringify(template.body, null, 2)
}

function applyCustomBuilder() {
  model.value = customModel.value
  method.value = customMethod.value
  requestBody.value = JSON.stringify(customRequestBody.value, null, 2)
  selectedTemplate.value = 'custom-builder'
}

function addDomainFilter() {
  const mapping = modelFieldMap[customModel.value]
  const defaultField = mapping ? mapping.defaults[0] : 'name'
  customDomain.value.push({
    id: ++domainFilterId,
    field: defaultField,
    operator: 'ilike',
    value: ''
  })
}

function removeDomainFilter(id: number) {
  const index = customDomain.value.findIndex(f => f.id === id)
  if (index !== -1) {
    customDomain.value.splice(index, 1)
  }
}

function addField(field: string) {
  const trimmed = field.trim()
  if (trimmed && !customFields.value.includes(trimmed)) {
    customFields.value.push(trimmed)
  }
}

function removeField(index: number) {
  customFields.value.splice(index, 1)
}

// Normalize Odoo URL: strip trailing paths like /web, /odoo, /web/login, etc.
function normalizeOdooUrl(url: string): string {
  let normalized = url.trim().replace(/\/+$/, '') // Remove trailing slashes
  // Strip common Odoo paths that users might accidentally include
  const pathsToStrip = ['/web/login', '/web', '/odoo', '/jsonrpc', '/xmlrpc']
  for (const path of pathsToStrip) {
    if (normalized.endsWith(path)) {
      normalized = normalized.slice(0, -path.length)
    }
  }
  return normalized
}

// Call Odoo API (via proxy or direct) with timeout
async function callOdooApi(model: string, method: string, body: any = {}): Promise<{ ok: boolean; status: number; data: any; time?: number }> {
  // Create AbortController for 30s timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    if (useProxy.value) {
      // Use serverless proxy to avoid CORS issues
      const res = await fetch('/api/odoo-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          odooUrl: normalizeOdooUrl(baseUrl.value),
          apiKey: apiKey.value,
          model,
          method,
          body
        }),
        signal: controller.signal
      })

      const result = await res.json()

      return {
        ok: result._status >= 200 && result._status < 300,
        status: result._status || res.status,
        data: result.data !== undefined ? result.data : { error: 'Unexpected response format' },
        time: result._time
      }
    } else {
      // Direct call (requires CORS extension or server config)
      const url = `${normalizeOdooUrl(baseUrl.value)}/json/2/${model}/${method}`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.value}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      })

      const contentType = res.headers.get('content-type') || ''
      let data: any
      if (contentType.includes('application/json')) {
        data = await res.json()
      } else {
        const text = await res.text()
        data = { _raw: text.slice(0, 500), _note: 'Non-JSON response' }
      }

      return { ok: res.ok, status: res.status, data }
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function testConnection() {
  if (!baseUrl.value || !apiKey.value) return

  connectionStatus.value = 'testing'
  error.value = ''
  isNeutralized.value = null // Reset to unknown while testing
  connectedUserName.value = ''

  try {
    const start = performance.now()

    // Test connection by getting current user info
    const result = await callOdooApi('res.users', 'search_read', {
      domain: [["id", "=", 1]],
      fields: ["name"],
      limit: 1
    })

    const elapsed = result.time || Math.round(performance.now() - start)

    if (result.ok) {
      connectionStatus.value = 'success'
      isConnected.value = true
      responseTime.value = elapsed

      // Store the user name if available
      if (Array.isArray(result.data) && result.data.length > 0) {
        connectedUserName.value = result.data[0].name || ''
      }

      // Check if database is neutralized (in background, don't block connection)
      checkNeutralized()

      triggerConfetti()
    } else {
      connectionStatus.value = 'error'
      error.value = result.data?.message || result.data?.error || `HTTP ${result.status}`
      isConnected.value = false
    }
  } catch (e: any) {
    connectionStatus.value = 'error'
    isConnected.value = false

    // Handle specific error types
    if (e.name === 'AbortError') {
      error.value = 'Request timed out. Check your Odoo URL and try again.'
    } else if (!useProxy.value && (e.message?.includes('fetch') || e.name === 'TypeError')) {
      error.value = 'CORS blocked - enable proxy mode or use a CORS extension'
    } else {
      error.value = e.message || 'Connection failed'
    }
  }
}

// Check if database is neutralized (sandbox mode)
async function checkNeutralized() {
  // Method 1: Try get_param (requires admin access to ir.config_parameter)
  try {
    const result = await callOdooApi('ir.config_parameter', 'get_param', {
      key: 'database.is_neutralized'
    })

    if (result.ok) {
      // Odoo get_param returns 'True' (string) for neutralized, False (boolean→false) otherwise
      const value = result.data
      if (value === true || value === 'True' || value === '1') {
        isNeutralized.value = true // Confirmed neutralized
      } else {
        // Parameter is False or doesn't exist - not neutralized, but could be trial/test
        // Only flag as production for non-trial domains
        isNeutralized.value = isLikelyTrialDomain() ? null : false
      }
      return
    }
  } catch {
    // Silently continue to fallback
  }

  // Method 2: Fallback - search ir.config_parameter directly
  try {
    const result = await callOdooApi('ir.config_parameter', 'search_read', {
      domain: [['key', '=', 'database.is_neutralized']],
      fields: ['value'],
      limit: 1
    })

    if (result.ok && Array.isArray(result.data)) {
      if (result.data.length > 0) {
        const val = result.data[0].value
        if (val === 'True' || val === '1' || val === true) {
          isNeutralized.value = true
        } else {
          isNeutralized.value = isLikelyTrialDomain() ? null : false
        }
      } else {
        // Parameter doesn't exist entirely
        isNeutralized.value = isLikelyTrialDomain() ? null : false
      }
      return
    }
  } catch {
    // Silently continue
  }

  // Both methods failed - user likely doesn't have access
  isNeutralized.value = null
}

// Check if the Odoo URL looks like a trial/sandbox domain
function isLikelyTrialDomain(): boolean {
  const url = baseUrl.value.toLowerCase()
  return url.includes('.odoo.com') || url.includes('.runbot') || url.includes('localhost') || url.includes('127.0.0.1')
}

function getRandomLoadingMessage(): string {
  return loadingMessages[Math.floor(Math.random() * loadingMessages.length)]
}

async function executeRequest() {
  // Prevent double-execution (race condition fix)
  if (isLoading.value) return

  if (!baseUrl.value || !apiKey.value) {
    error.value = 'Please configure connection first'
    return
  }

  // Validate model and method
  if (!model.value || !/^[a-z_]+(\.[a-z_]+)+$/.test(model.value)) {
    error.value = 'Invalid model format. Use: module.model (e.g., res.partner)'
    return
  }
  if (!method.value || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(method.value)) {
    error.value = 'Invalid method. Must start with a letter (no underscore prefix).'
    return
  }

  // Set loading state FIRST to prevent race condition
  isLoading.value = true
  error.value = ''
  response.value = null
  loadingMessage.value = getRandomLoadingMessage()
  showDebugTraceback.value = false

  const start = performance.now()

  try {
    let body: any
    try {
      body = JSON.parse(requestBody.value)
    } catch (e) {
      throw new Error('Invalid JSON in request body')
    }

    // Call Odoo API
    const result = await callOdooApi(model.value, method.value, body)

    const elapsed = result.time || Math.round(performance.now() - start)
    responseTime.value = elapsed
    responseStatus.value = result.status
    response.value = result.data

    // Update stats
    stats.value.calls++
    if (result.ok) {
      stats.value.successful++
      streak.value++
      if (streak.value > bestStreak.value) {
        bestStreak.value = streak.value
      }
      if (stats.value.fastest === 0 || elapsed < stats.value.fastest) {
        stats.value.fastest = elapsed
      }
      triggerSuccessAnimation()
      if (streak.value >= 3 || elapsed < 200) {
        triggerConfetti()
      }
    } else {
      streak.value = 0
    }

    // Add to history
    history.value.unshift({
      id: Date.now(),
      model: model.value,
      method: method.value,
      status: result.status,
      time: elapsed,
      timestamp: new Date()
    })

    // Keep only last 10
    if (history.value.length > 10) history.value.pop()

  } catch (e: any) {
    if (e.name === 'AbortError') {
      error.value = 'Request timed out after 30 seconds'
    } else {
      error.value = e.message || 'Request failed'
    }
    responseStatus.value = 0
    streak.value = 0
  } finally {
    isLoading.value = false
    loadingMessage.value = ''
  }
}

function triggerConfetti() {
  showConfetti.value = true
  setTimeout(() => { showConfetti.value = false }, 2500)
}

function triggerSuccessAnimation() {
  showSuccessAnimation.value = true
  setTimeout(() => { showSuccessAnimation.value = false }, 600)
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copyFeedback.value = 'Copied!'
    setTimeout(() => { copyFeedback.value = '' }, 2000)
  } catch (e) {
    copyFeedback.value = 'Copy failed'
    setTimeout(() => { copyFeedback.value = '' }, 2000)
  }
}

function formatJson(obj: any): string {
  return JSON.stringify(obj, null, 2)
}

// Format response JSON, stripping debug tracebacks for cleaner display
function formatResponseJson(obj: any): string {
  if (!obj || typeof obj !== 'object') {
    return JSON.stringify(obj, null, 2)
  }

  // Deep clone and remove debug/traceback fields
  const sanitized = JSON.parse(JSON.stringify(obj))
  removeTracebacks(sanitized)
  return JSON.stringify(sanitized, null, 2)
}

// Recursively remove debug/traceback fields from object
function removeTracebacks(obj: any): void {
  if (!obj || typeof obj !== 'object') return

  // Remove traceback-containing fields
  if ('debug' in obj && typeof obj.debug === 'string' && obj.debug.includes('Traceback')) {
    delete obj.debug
  }
  if ('traceback' in obj) {
    delete obj.traceback
  }

  // Recurse into nested objects/arrays
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object') {
      removeTracebacks(obj[key])
    }
  }
}

// Detect if response is an Odoo error
function isOdooError(data: any): boolean {
  if (!data || typeof data !== 'object') return false

  // Standard Odoo error format
  if ('message' in data && ('name' in data || 'debug' in data || 'code' in data)) {
    return true
  }

  // Proxy error format
  if ('error' in data && typeof data.error === 'string') {
    return true
  }

  // Check for debug field containing traceback
  if ('debug' in data && typeof data.debug === 'string' && data.debug.includes('Traceback')) {
    return true
  }

  return false
}

// Extract clean error info from Odoo error response
function parseOdooError(data: any): { type: string; message: string; hint: string; debug: string | null } {
  // Handle proxy error format { error: "..." }
  if ('error' in data && !('message' in data)) {
    return {
      type: 'Error',
      message: data.error,
      hint: '',
      debug: null
    }
  }

  const errorName = data.name || 'Error'
  const message = data.message || data.error || 'Unknown error'
  const debug = data.debug || null

  // Extract the exception type (e.g., "ValueError", "AccessError")
  const typeMatch = errorName.match(/\.(\w+)$/)
  const type = typeMatch ? typeMatch[1] : errorName.split('.').pop() || 'Error'

  // Generate helpful hints based on error type and message
  let hint = ''
  if (message.includes('Invalid field')) {
    const fieldMatch = message.match(/Invalid field '(\w+)' on '([\w.]+)'/)
    const conditionMatch = message.match(/Invalid field ([\w.]+)\.(\w+) in condition/)
    if (fieldMatch) {
      hint = `The field "${fieldMatch[1]}" doesn't exist on ${fieldMatch[2]}. Use fields_get to discover available fields.`
    } else if (conditionMatch) {
      hint = `The field "${conditionMatch[2]}" doesn't exist on ${conditionMatch[1]}. Check your domain filter — use fields_get to see valid field names.`
    } else {
      hint = 'One of the fields in your request doesn\'t exist on this model. Use fields_get to discover available fields.'
    }
  } else if (message.includes('does not exist')) {
    hint = 'Check the model name spelling and ensure it uses the technical name (e.g., res.partner)'
  } else if (type === 'AccessError' || message.includes('AccessError')) {
    hint = 'Your API user may not have permission for this operation'
  } else if (message.includes('cannot call') && message.includes('with ids')) {
    hint = 'This method doesn\'t accept ids - remove the "ids" parameter'
  } else if (message.includes('Private methods')) {
    hint = 'Methods starting with _ are private and cannot be called via API'
  } else if (message.includes('ValidationError')) {
    hint = 'Check required fields and data format'
  } else if (message.includes('MissingError') || message.includes('Record does not exist')) {
    hint = 'The record ID may not exist or may have been deleted'
  } else if (message.includes('UserError')) {
    hint = 'This is a business logic error - check the operation requirements'
  }

  return { type, message, hint, debug }
}

function clearHistory() {
  history.value = []
  stats.value = { calls: 0, successful: 0, fastest: 0 }
  streak.value = 0
}

function disconnect() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('odoo_playground_key')
    sessionStorage.removeItem('odoo_playground_url')
    // Keep proxy preference and best streak - user might want to reconnect
  }
  // Clear connection state
  apiKey.value = ''
  baseUrl.value = ''
  isConnected.value = false
  connectionStatus.value = 'idle'
  isNeutralized.value = null // Reset to unknown
  connectedUserName.value = ''

  // Clear session data (history, stats, response)
  history.value = []
  stats.value = { calls: 0, successful: 0, fastest: 0 }
  streak.value = 0
  response.value = null
  responseStatus.value = 0
  responseTime.value = 0
  error.value = ''
}
</script>

<template>
  <div class="api-playground" :class="{ 'success-pulse': showSuccessAnimation }">
    <!-- Celebration -->
    <div class="celebration-container" v-if="showConfetti">
      <div class="celebration-burst"></div>
      <div class="celebration-particle" v-for="i in 30" :key="'p'+i"
        :style="{ '--angle': (i * 12) + 'deg', '--dist': (60 + (i % 5) * 20) + 'vh', '--size': (4 + (i % 4) * 3) + 'px', '--delay': (i * 0.015) + 's', '--hue': (i * 12) % 360 }">
      </div>
      <div class="celebration-sparkle" v-for="j in 15" :key="'s'+j"
        :style="{ '--sx': (Math.random() * 100) + '%', '--sy': (Math.random() * 100) + '%', '--sdelay': (j * 0.08) + 's', '--ssize': (2 + (j % 3) * 2) + 'px' }">
      </div>
      <div class="celebration-ring"></div>
      <div class="celebration-ring ring-2"></div>
    </div>

    <!-- Header -->
    <div class="playground-header">
      <div class="header-content">
        <h2 class="playground-title">
          <span class="title-icon animated-rocket">🚀</span>
          API Playground
          <span class="beta-badge">BETA</span>
        </h2>
        <p class="playground-subtitle">Test Odoo JSON/2 API calls in real-time</p>
      </div>
      <div class="stats-bar" v-if="stats.calls > 0">
        <div class="stat">
          <span class="stat-value">{{ stats.calls }}</span>
          <span class="stat-label">Calls</span>
        </div>
        <div class="stat success">
          <span class="stat-value">{{ stats.successful }}</span>
          <span class="stat-label">Success</span>
        </div>
        <div class="stat" v-if="stats.fastest">
          <span class="stat-value">{{ stats.fastest }}ms</span>
          <span class="stat-label">Fastest</span>
        </div>
        <div class="stat streak" v-if="streak > 0">
          <span class="stat-value">🔥 {{ streak }}</span>
          <span class="stat-label">Streak</span>
        </div>
        <div class="stat best-streak" v-if="bestStreak > 2">
          <span class="stat-value">🏆 {{ bestStreak }}</span>
          <span class="stat-label">Best</span>
        </div>
      </div>
    </div>

    <!-- Connection Panel -->
    <div class="connection-panel" :class="{ connected: isConnected }">
      <div class="connection-header">
        <span class="connection-icon">{{ isConnected ? '🔗' : '🔌' }}</span>
        <span class="connection-title">
          {{ isConnected ? 'Connected' : 'Connect to Odoo' }}
          <span v-if="isConnected && connectedUserName" class="connected-user">as {{ connectedUserName }}</span>
        </span>
        <span v-if="isNeutralized === true" class="neutralized-badge" title="This is a neutralized database (sandbox mode)">🧪 Sandbox</span>
        <span v-else-if="isConnected && isNeutralized === null && isLikelyTrialDomain()" class="trial-badge" title="Odoo Online trial/demo instance">☁️ Trial</span>
        <span v-else-if="isNeutralized === false" class="production-badge" title="This is a production database - be careful!">⚠️ Production</span>
        <button v-if="isConnected" class="disconnect-btn" @click="disconnect">Disconnect</button>
      </div>

      <!-- Neutralized database notice -->
      <div v-if="isConnected && isNeutralized === true" class="neutralized-notice">
        <span class="notice-icon">🧪</span>
        <div>
          <strong>Sandbox Mode</strong> - This database is neutralized.
          <br><small>Scheduled actions, emails, and webhooks are disabled. Perfect for testing!</small>
        </div>
      </div>

      <!-- Trial instance notice -->
      <div v-if="isConnected && isNeutralized === null && isLikelyTrialDomain()" class="trial-notice">
        <span class="notice-icon">☁️</span>
        <div>
          <strong>Odoo Online Trial</strong>
          <br><small>This is a shared trial instance. Data may be reset periodically. Safe for testing!</small>
        </div>
      </div>

      <!-- Production environment warning -->
      <div v-if="isConnected && isNeutralized === false" class="production-warning">
        <span class="notice-icon">⚠️</span>
        <div>
          <strong>Production Environment Detected</strong>
          <br><small>This is a live database. Be careful with create, write, and delete operations as they will affect real data. Consider using a neutralized copy for testing.</small>
        </div>
      </div>

      <form class="connection-form" v-if="!isConnected" @submit.prevent="testConnection" autocomplete="on">
        <!-- Hidden username field for accessibility (browser password managers) -->
        <input type="text" name="username" autocomplete="username" class="sr-only" tabindex="-1" aria-hidden="true" />

        <div class="form-row">
          <label class="form-label" for="odoo-url">Odoo URL</label>
          <input
            id="odoo-url"
            v-model="baseUrl"
            type="url"
            class="form-input"
            placeholder="https://your-odoo.com"
            autocomplete="url"
          />
          <span class="form-hint">Just the domain, no /web or /odoo path</span>
        </div>

        <div class="form-row">
          <label class="form-label" for="api-key">API Key</label>
          <div class="input-with-toggle">
            <input
              id="api-key"
              v-model="apiKey"
              :type="showApiKey ? 'text' : 'password'"
              class="form-input"
              placeholder="odoo_api_xxxxxxxx..."
              autocomplete="current-password"
            />
            <button type="button" class="toggle-visibility" @click="showApiKey = !showApiKey">
              {{ showApiKey ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <div class="proxy-toggle">
          <label class="toggle-label">
            <input type="checkbox" v-model="useProxy" class="toggle-input" />
            <span class="toggle-switch"></span>
            <span class="toggle-text">
              <strong>{{ useProxy ? 'Proxy Mode' : 'Direct Mode' }}</strong>
              <span class="toggle-hint">{{ useProxy ? '(Works with Odoo.com)' : '(Requires CORS)' }}</span>
            </span>
          </label>
        </div>

        <button
          type="submit"
          class="test-connection-btn"
          :class="connectionStatus"
          :disabled="!baseUrl || !apiKey || connectionStatus === 'testing'"
        >
          <span v-if="connectionStatus === 'testing'" class="spinner"></span>
          <span v-else-if="connectionStatus === 'success'">✓ Connected</span>
          <span v-else-if="connectionStatus === 'error'">✗ Failed - Retry</span>
          <span v-else>🚀 Launch Connection</span>
        </button>

        <!-- Connection Error Display -->
        <div v-if="connectionStatus === 'error' && error" class="connection-error">
          <span class="error-icon">⚠️</span>
          <span class="error-text">{{ error }}</span>
        </div>

        <div class="connection-info">
          <div v-if="useProxy" class="info-box proxy-info">
            <span class="info-icon">🔄</span>
            <div>
              <strong>Proxy Mode</strong> - Requests go through our server to bypass CORS.
              <br><small>Works with Odoo.com sandboxes and any Odoo instance.</small>
            </div>
          </div>
          <div v-else class="info-box direct-info">
            <span class="info-icon">⚡</span>
            <div>
              <strong>Direct Mode</strong> - Requests go straight to your Odoo.
              <br><small>Requires CORS extension or server configuration.</small>
            </div>
          </div>
          <p class="security-note">🔒 Your API key is sent {{ useProxy ? 'through our proxy' : 'directly' }} to your Odoo instance.</p>
        </div>
      </form>
    </div>

    <!-- Main Content -->
    <div class="playground-content" v-if="isConnected">
      <!-- Template Selector -->
      <div class="template-section">
        <div class="category-tabs">
          <button
            v-for="cat in categories"
            :key="cat.id"
            class="category-tab"
            :class="{ active: selectedCategory === cat.id }"
            @click="selectedCategory = cat.id"
          >
            <span class="tab-icon">{{ cat.icon }}</span>
            <span class="tab-name">{{ cat.name }}</span>
          </button>
        </div>

        <!-- Regular Templates Grid -->
        <div class="template-grid" v-if="selectedCategory !== 'custom'">
          <button
            v-for="template in currentTemplates"
            :key="template.id"
            class="template-card"
            :class="{ active: selectedTemplate === template.id }"
            @click="selectTemplate(template)"
          >
            <span class="template-icon">{{ template.icon }}</span>
            <span class="template-name">{{ template.name }}</span>
          </button>
        </div>

        <!-- Custom Query Builder -->
        <div class="custom-builder" v-else>
          <div class="builder-section">
            <h4 class="builder-title">🛠️ Build Your Query</h4>

            <!-- Model Selection -->
            <div class="builder-row">
              <label class="builder-label">Model</label>
              <div class="model-input-wrapper">
                <input
                  v-model="customModel"
                  class="builder-input"
                  placeholder="e.g., res.partner"
                  list="popular-models"
                />
                <datalist id="popular-models">
                  <option v-for="m in popularModels" :key="m" :value="m" />
                </datalist>
              </div>
            </div>

            <!-- Method Selection -->
            <div class="builder-row">
              <label class="builder-label">Method</label>
              <div class="method-grid">
                <button
                  v-for="m in commonMethods"
                  :key="m.id"
                  type="button"
                  class="method-chip"
                  :class="{ active: customMethod === m.id }"
                  @click="customMethod = m.id"
                  :title="m.description"
                >
                  <span class="method-icon">{{ m.icon }}</span>
                  <span class="method-name">{{ m.name }}</span>
                </button>
              </div>
            </div>

            <!-- Fields (for search_read, read) -->
            <div class="builder-row" v-if="['search_read', 'read'].includes(customMethod)">
              <label class="builder-label">Fields</label>
              <div class="fields-wrapper">
                <div class="fields-chips">
                  <span
                    v-for="(field, idx) in customFields"
                    :key="field"
                    class="field-chip"
                  >
                    {{ field }}
                    <button class="remove-chip" @click="removeField(idx)">×</button>
                  </span>
                  <input
                    class="field-input"
                    placeholder="+ Add field"
                    @keydown.enter.prevent="(e: Event) => { addField((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = '' }"
                  />
                </div>
                <div class="quick-fields">
                  <button
                    v-for="f in currentQuickFields"
                    :key="f"
                    type="button"
                    class="quick-field-btn"
                    :class="{ selected: customFields.includes(f) }"
                    @click="addField(f)"
                  >{{ f }}</button>
                </div>
              </div>
            </div>

            <!-- Record IDs (for read, write, unlink) -->
            <div class="builder-row" v-if="['read', 'write', 'unlink'].includes(customMethod)">
              <label class="builder-label">Record IDs</label>
              <input
                v-model="customRecordIds"
                class="builder-input"
                placeholder="e.g., 1, 2, 3"
              />
              <span class="builder-hint">Comma-separated list of record IDs</span>
            </div>

            <!-- Domain Filters -->
            <div class="builder-row" v-if="['search_read', 'search_count', 'name_search'].includes(customMethod)">
              <label class="builder-label">
                Filters
                <button type="button" class="add-filter-btn" @click="addDomainFilter">+ Add</button>
              </label>
              <div class="domain-filters">
                <div v-if="customDomain.length === 0" class="no-filters">
                  No filters - will return all records (up to limit)
                </div>
                <div
                  v-for="filter in customDomain"
                  :key="filter.id"
                  class="domain-filter"
                >
                  <input
                    v-model="filter.field"
                    class="filter-field"
                    placeholder="field"
                  />
                  <select v-model="filter.operator" class="filter-operator">
                    <option v-for="op in domainOperators" :key="op.value" :value="op.value">
                      {{ op.label }}
                    </option>
                  </select>
                  <input
                    v-model="filter.value"
                    class="filter-value"
                    placeholder="value"
                  />
                  <button type="button" class="remove-filter-btn" @click="removeDomainFilter(filter.id)">🗑️</button>
                </div>
              </div>
            </div>

            <!-- Limit -->
            <div class="builder-row" v-if="['search_read', 'name_search'].includes(customMethod)">
              <label class="builder-label">Limit</label>
              <input
                v-model.number="customLimit"
                type="number"
                class="builder-input limit-input"
                min="1"
                max="1000"
              />
            </div>

            <!-- Apply Button -->
            <button class="apply-builder-btn" @click="applyCustomBuilder">
              <span>🎯 Apply to Editor</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Request Editor -->
      <div class="editor-section">
        <div class="editor-header">
          <div class="endpoint-display">
            <span class="method-badge">POST</span>
            <span class="endpoint-path">/json/2/</span>
            <input v-model="model" class="endpoint-input model" placeholder="model" />
            <span class="endpoint-path">/</span>
            <input v-model="method" class="endpoint-input method" placeholder="method" />
          </div>

          <div class="editor-actions">
            <button class="copy-btn" @click="copyToClipboard(requestBody)" title="Copy request">
              {{ copyFeedback || '📋' }}
            </button>
          </div>
        </div>

        <div class="code-editor">
          <textarea
            v-model="requestBody"
            class="code-textarea"
            spellcheck="false"
            placeholder="Enter JSON request body..."
          ></textarea>
        </div>

        <div class="execute-bar">
          <button
            class="execute-btn"
            :disabled="isLoading"
            @click="executeRequest"
          >
            <span v-if="isLoading" class="spinner"></span>
            <span v-else>
              <span class="execute-icon">▶</span>
              Execute
            </span>
            <span class="shortcut">Ctrl+Enter</span>
          </button>
        </div>
      </div>

      <!-- Response Viewer -->
      <div class="response-section" :class="{ 'has-response': response || error }">
        <div class="response-header">
          <span class="response-title">Response</span>
          <div class="response-meta" v-if="responseStatus">
            <span
              class="status-badge"
              :class="responseStatus >= 200 && responseStatus < 300 ? 'success' : 'error'"
            >
              {{ responseStatus }}
            </span>
            <span class="response-time">{{ responseTime }}ms</span>
          </div>
        </div>

        <div class="response-content">
          <div v-if="isLoading" class="loading-state">
            <div class="loading-spinner"></div>
            <span class="loading-message">{{ loadingMessage }}</span>
          </div>

          <div v-else-if="error" class="error-state">
            <span class="error-icon">❌</span>
            <span class="error-message">{{ error }}</span>
          </div>

          <div v-else-if="response && isOdooError(response)" class="odoo-error-display">
            <div class="odoo-error-header">
              <span class="odoo-error-icon">⚠️</span>
              <div class="odoo-error-info">
                <span class="odoo-error-type">{{ parseOdooError(response).type }}</span>
                <span class="odoo-error-message">{{ parseOdooError(response).message }}</span>
              </div>
            </div>
            <div v-if="parseOdooError(response).hint" class="odoo-error-hint">
              <span class="hint-icon">💡</span>
              <span>{{ parseOdooError(response).hint }}</span>
            </div>
            <div v-if="parseOdooError(response).debug" class="odoo-error-debug">
              <button class="toggle-debug-btn" @click="showDebugTraceback = !showDebugTraceback">
                {{ showDebugTraceback ? '🔽 Hide' : '▶️ Show' }} Technical Details
              </button>
              <pre v-if="showDebugTraceback" class="debug-traceback">{{ parseOdooError(response).debug }}</pre>
            </div>
          </div>

          <div v-else-if="response" class="response-data">
            <button class="copy-btn floating" @click="copyToClipboard(formatResponseJson(response))">
              📋 Copy
            </button>
            <pre class="json-output">{{ formatResponseJson(response) }}</pre>
          </div>

          <div v-else class="empty-state">
            <div class="empty-animation">
              <span class="empty-icon bounce">🎮</span>
            </div>
            <span class="empty-text">Pick a template or build a custom query!</span>
            <span class="empty-hint">Hit Execute to see the magic ✨</span>
          </div>
        </div>
      </div>

      <!-- History Panel -->
      <div class="history-section" v-if="history.length > 0">
        <div class="history-header">
          <span class="history-title">📜 Recent Requests</span>
          <button class="clear-history-btn" @click="clearHistory">Clear</button>
        </div>

        <div class="history-list">
          <div
            v-for="item in history"
            :key="item.id"
            class="history-item"
            :class="item.status >= 200 && item.status < 300 ? 'success' : 'error'"
          >
            <span class="history-endpoint">{{ item.model }}/{{ item.method }}</span>
            <span class="history-status">{{ item.status }}</span>
            <span class="history-time">{{ item.time }}ms</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Not Connected State -->
    <div class="not-connected-state" v-else>
      <div class="not-connected-content">
        <div class="not-connected-animation">
          <span class="not-connected-icon float">🎪</span>
        </div>
        <h3>Welcome to the API Playground!</h3>
        <p>Enter your Odoo URL and API key above to start the fun.</p>
        <div class="features-preview">
          <div class="feature">🔍 Search Records</div>
          <div class="feature">➕ Create Data</div>
          <div class="feature">✏️ Update Records</div>
          <div class="feature">🛠️ Build Custom Queries</div>
        </div>
        <div class="security-note">
          <strong>🛡️ Security:</strong> Your credentials are stored only in your browser's session.
          In proxy mode, requests go through our server to your Odoo. API keys are not stored.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.api-playground {
  max-width: 1000px;
  margin: 2rem auto;
  font-family: var(--vp-font-family-base);
  position: relative;
}

/* Success pulse animation */
.api-playground.success-pulse {
  animation: success-pulse 0.6s ease;
}

@keyframes success-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.005); }
}

/* Celebration */
.celebration-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.celebration-burst {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.4), rgba(139, 92, 246, 0.2), transparent 70%);
  animation: burst-expand 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  transform: translate(-50%, -50%);
}

.celebration-particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  background: radial-gradient(circle, hsl(var(--hue), 85%, 65%), hsl(var(--hue), 90%, 50%));
  box-shadow: 0 0 8px 2px hsla(var(--hue), 90%, 60%, 0.6);
  opacity: 0;
  animation: particle-burst 1.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: var(--delay);
}

.celebration-sparkle {
  position: absolute;
  left: var(--sx);
  top: var(--sy);
  width: var(--ssize);
  height: var(--ssize);
  border-radius: 50%;
  background: white;
  box-shadow: 0 0 6px 2px rgba(255, 255, 255, 0.8), 0 0 12px 4px rgba(139, 92, 246, 0.4);
  opacity: 0;
  animation: sparkle-pop 1s ease-out forwards;
  animation-delay: var(--sdelay);
}

.celebration-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  border: 2px solid rgba(99, 102, 241, 0.5);
  box-shadow: 0 0 20px 4px rgba(99, 102, 241, 0.15);
  transform: translate(-50%, -50%);
  animation: ring-expand 1.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.celebration-ring.ring-2 {
  border-color: rgba(139, 92, 246, 0.4);
  box-shadow: 0 0 20px 4px rgba(139, 92, 246, 0.1);
  animation-delay: 0.15s;
}

@keyframes burst-expand {
  0% { width: 0; height: 0; opacity: 1; }
  60% { opacity: 0.6; }
  100% { width: 120vmax; height: 120vmax; opacity: 0; }
}

@keyframes particle-burst {
  0% {
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0);
    opacity: 1;
    filter: blur(0);
  }
  30% {
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(calc(var(--dist) * -1));
    opacity: 0;
    filter: blur(1px);
  }
}

@keyframes sparkle-pop {
  0% { transform: scale(0); opacity: 0; }
  30% { transform: scale(1.8); opacity: 1; }
  50% { transform: scale(0.8); opacity: 0.9; }
  70% { transform: scale(1.2); opacity: 0.6; }
  100% { transform: scale(0); opacity: 0; }
}

@keyframes ring-expand {
  0% { width: 0; height: 0; opacity: 1; border-width: 3px; }
  100% { width: 80vmin; height: 80vmin; opacity: 0; border-width: 1px; }
}

/* Header */
.playground-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.1));
  border-radius: 16px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  position: relative;
  overflow: hidden;
}

.playground-header::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  animation: shimmer 3s infinite;
}

@keyframes shimmer {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(5deg); }
}

.playground-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title-icon {
  font-size: 1.5rem;
}

.animated-rocket {
  display: inline-block;
  animation: rocket-float 2s ease-in-out infinite;
}

@keyframes rocket-float {
  0%, 100% { transform: translateY(0) rotate(-10deg); }
  50% { transform: translateY(-5px) rotate(10deg); }
}

.beta-badge {
  font-size: 0.6rem;
  padding: 0.2rem 0.5rem;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  border-radius: 4px;
  font-weight: 700;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.playground-subtitle {
  margin: 0.25rem 0 0;
  color: var(--vp-c-text-2);
  font-size: 0.95rem;
}

.stats-bar {
  display: flex;
  gap: 1.5rem;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}

.stat.success .stat-value {
  color: #10b981;
}

.stat.streak .stat-value {
  color: #f59e0b;
  animation: flame 0.5s ease infinite;
}

@keyframes flame {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.stat.best-streak .stat-value {
  color: #8b5cf6;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
}

/* Connection Panel */
.connection-panel {
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--vp-c-border);
  transition: all 0.3s ease;
}

.connection-panel.connected {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
  border-color: rgba(16, 185, 129, 0.3);
}

.connection-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.connection-icon {
  font-size: 1.25rem;
}

.connection-title {
  font-weight: 600;
  flex: 1;
}

.disconnect-btn {
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.disconnect-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.connection-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.form-hint {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  margin-top: 0.25rem;
}

/* Screen reader only - visually hidden for accessibility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.form-input {
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  font-size: 0.9rem;
  font-family: var(--vp-font-family-mono);
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.input-with-toggle {
  position: relative;
  display: flex;
}

.input-with-toggle .form-input {
  flex: 1;
  padding-right: 2.5rem;
}

.toggle-visibility {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0.7;
}

.toggle-visibility:hover {
  opacity: 1;
}

/* Proxy Toggle */
.proxy-toggle {
  margin-bottom: 0.5rem;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.toggle-input {
  display: none;
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  background: var(--vp-c-border);
  border-radius: 12px;
  transition: background 0.2s;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-input:checked + .toggle-switch {
  background: var(--vp-c-brand-1);
}

.toggle-input:checked + .toggle-switch::after {
  transform: translateX(20px);
}

.toggle-text {
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
}

.toggle-hint {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

/* Connection Info */
.connection-info {
  margin-top: 0.75rem;
}

.info-box {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  line-height: 1.4;
}

.info-box small {
  color: var(--vp-c-text-3);
}

.proxy-info {
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.direct-info {
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.2);
}

.info-icon {
  font-size: 1.25rem;
}

.test-connection-btn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--vp-c-brand-1), #8b5cf6);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.test-connection-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.test-connection-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.test-connection-btn.success {
  background: #10b981;
}

.test-connection-btn.error {
  background: #ef4444;
}

/* Connection Error Display */
.connection-error {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
  font-size: 0.85rem;
  line-height: 1.4;
}

.connection-error .error-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.connection-error .error-text {
  word-break: break-word;
}

/* Connected user display */
.connected-user {
  font-weight: 400;
  color: var(--vp-c-text-2);
  font-size: 0.9em;
}

/* Neutralized/Sandbox badge */
.neutralized-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border-radius: 12px;
  font-weight: 600;
  margin-left: 0.5rem;
}

/* Trial badge */
.trial-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border-radius: 12px;
  font-weight: 600;
  margin-left: 0.5rem;
}

/* Production badge */
.production-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  border-radius: 12px;
  font-weight: 600;
  margin-left: 0.5rem;
  animation: pulse-warning 2s ease-in-out infinite;
}

@keyframes pulse-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

/* Environment notices */
.neutralized-notice,
.trial-notice,
.production-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-top: 0.75rem;
  font-size: 0.85rem;
  line-height: 1.4;
}

.neutralized-notice {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.trial-notice {
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.production-warning {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.production-warning strong {
  color: #d97706;
}

.notice-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.neutralized-notice small,
.trial-notice small,
.production-warning small {
  color: var(--vp-c-text-2);
}

.connection-info .security-note {
  margin: 0.5rem 0 0;
  padding: 0.5rem;
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  background: rgba(16, 185, 129, 0.1);
  border-radius: 4px;
}

/* Template Section */
.template-section {
  margin-bottom: 1.5rem;
}

.category-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.category-tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s;
}

.category-tab:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-1px);
}

.category-tab.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.tab-icon {
  font-size: 1rem;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
}

.template-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 1rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.template-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.template-card.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
}

.template-icon {
  font-size: 1.5rem;
}

.template-name {
  font-size: 0.8rem;
  font-weight: 500;
  text-align: center;
}

/* Custom Builder */
.custom-builder {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.05));
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 12px;
  padding: 1.25rem;
}

.builder-title {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.builder-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.builder-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.builder-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.builder-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-family: var(--vp-font-family-mono);
  font-size: 0.9rem;
}

.builder-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.builder-hint {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

.limit-input {
  width: 100px;
}

/* Method Grid */
.method-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.5rem;
}

.method-chip {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.method-chip:hover {
  border-color: var(--vp-c-brand-1);
}

.method-chip.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.method-icon {
  font-size: 1rem;
}

/* Fields */
.fields-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.fields-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  padding: 0.5rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  min-height: 40px;
}

.field-chip {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: var(--vp-c-brand-soft);
  border-radius: 4px;
  font-size: 0.8rem;
  font-family: var(--vp-font-family-mono);
}

.remove-chip {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  opacity: 0.7;
  padding: 0;
}

.remove-chip:hover {
  opacity: 1;
}

.field-input {
  border: none;
  background: transparent;
  font-size: 0.85rem;
  min-width: 80px;
  flex: 1;
}

.field-input:focus {
  outline: none;
}

.quick-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.quick-field-btn {
  padding: 0.2rem 0.5rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  font-family: var(--vp-font-family-mono);
  transition: all 0.2s;
}

.quick-field-btn:hover {
  border-color: var(--vp-c-brand-1);
}

.quick-field-btn.selected {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
}

/* Domain Filters */
.add-filter-btn {
  padding: 0.2rem 0.5rem;
  background: var(--vp-c-brand-soft);
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--vp-c-brand-1);
}

.domain-filters {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.no-filters {
  padding: 0.75rem;
  background: var(--vp-c-bg);
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  text-align: center;
}

.domain-filter {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.filter-field,
.filter-value {
  flex: 1;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  font-size: 0.85rem;
  font-family: var(--vp-font-family-mono);
}

.filter-operator {
  padding: 0.4rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  font-size: 0.85rem;
  background: var(--vp-c-bg);
}

.remove-filter-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0.7;
}

.remove-filter-btn:hover {
  opacity: 1;
}

.apply-builder-btn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 0.5rem;
}

.apply-builder-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

/* Editor Section */
.editor-section {
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--vp-c-border);
  margin-bottom: 1.5rem;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-border);
}

.endpoint-display {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.9rem;
}

.method-badge {
  background: #10b981;
  color: white;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  margin-right: 0.5rem;
}

.endpoint-path {
  color: var(--vp-c-text-3);
}

.endpoint-input {
  border: none;
  background: rgba(99, 102, 241, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: inherit;
  font-size: inherit;
  color: var(--vp-c-brand-1);
  font-weight: 500;
}

.endpoint-input.model {
  width: 120px;
}

.endpoint-input.method {
  width: 100px;
}

.endpoint-input:focus {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 1px;
}

.editor-actions {
  display: flex;
  gap: 0.5rem;
}

.copy-btn {
  background: none;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  padding: 0.375rem 0.625rem;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
}

.copy-btn.floating {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: var(--vp-c-bg);
  z-index: 1;
}

.code-editor {
  position: relative;
}

.code-textarea {
  width: 100%;
  min-height: 200px;
  padding: 1rem;
  border: none;
  background: var(--vp-c-bg);
  font-family: var(--vp-font-family-mono);
  font-size: 0.875rem;
  line-height: 1.6;
  resize: vertical;
  color: var(--vp-c-text-1);
}

.code-textarea:focus {
  outline: none;
}

.execute-bar {
  padding: 0.75rem 1rem;
  background: var(--vp-c-bg);
  border-top: 1px solid var(--vp-c-border);
}

.execute-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.875rem;
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.execute-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.execute-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.execute-icon {
  font-size: 0.9rem;
}

.shortcut {
  font-size: 0.75rem;
  opacity: 0.7;
  margin-left: 0.5rem;
  padding: 0.15rem 0.4rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

/* Response Section */
.response-section {
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--vp-c-border);
  margin-bottom: 1.5rem;
}

.response-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-border);
}

.response-title {
  font-weight: 600;
}

.response-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-badge {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 700;
  font-family: var(--vp-font-family-mono);
}

.status-badge.success {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.status-badge.error {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.response-time {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
}

.response-content {
  min-height: 150px;
  position: relative;
}

.loading-state,
.empty-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--vp-c-text-3);
  gap: 0.75rem;
}

.empty-icon,
.error-icon {
  font-size: 2rem;
}

.empty-animation {
  margin-bottom: 0.5rem;
}

.bounce {
  display: inline-block;
  animation: bounce 1s ease infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.empty-text {
  font-size: 1rem;
  color: var(--vp-c-text-2);
}

.empty-hint {
  font-size: 0.85rem;
}

.loading-message {
  font-style: italic;
  animation: fade-pulse 1.5s ease infinite;
}

@keyframes fade-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.error-state {
  color: #ef4444;
}

.response-data {
  position: relative;
}

.json-output {
  margin: 0;
  padding: 1rem;
  background: var(--vp-c-bg);
  font-family: var(--vp-font-family-mono);
  font-size: 0.85rem;
  line-height: 1.6;
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
}

/* Odoo Error Display */
.odoo-error-display {
  padding: 1.25rem;
  background: var(--vp-c-bg);
}

.odoo-error-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.odoo-error-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.odoo-error-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.odoo-error-type {
  font-size: 0.8rem;
  font-weight: 600;
  color: #ef4444;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.odoo-error-message {
  font-size: 1rem;
  color: var(--vp-c-text-1);
  font-weight: 500;
  line-height: 1.4;
}

.odoo-error-hint {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.hint-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.odoo-error-debug {
  border-top: 1px solid var(--vp-c-border);
  padding-top: 0.75rem;
}

.toggle-debug-btn {
  background: none;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-debug-btn:hover {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-text-3);
}

.debug-traceback {
  margin: 0.75rem 0 0;
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.1);
  border-radius: 6px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

/* History Section */
.history-section {
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid var(--vp-c-border);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.history-title {
  font-weight: 600;
}

.clear-history-btn {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  background: none;
  border: none;
  cursor: pointer;
}

.clear-history-btn:hover {
  color: var(--vp-c-text-1);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--vp-c-bg);
  border-radius: 6px;
  font-size: 0.85rem;
  font-family: var(--vp-font-family-mono);
}

.history-item.success {
  border-left: 3px solid #10b981;
}

.history-item.error {
  border-left: 3px solid #ef4444;
}

.history-endpoint {
  flex: 1;
  color: var(--vp-c-text-2);
}

.history-status {
  font-weight: 600;
}

.history-time {
  color: var(--vp-c-text-3);
}

/* Not Connected State */
.not-connected-state {
  text-align: center;
  padding: 4rem 2rem;
}

.not-connected-animation {
  margin-bottom: 1rem;
}

.float {
  display: inline-block;
  font-size: 4rem;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}

.not-connected-icon {
  display: block;
}

.not-connected-content h3 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
}

.not-connected-content p {
  color: var(--vp-c-text-2);
  margin: 0 0 1.5rem;
}

.features-preview {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.feature {
  padding: 0.5rem 1rem;
  background: var(--vp-c-brand-soft);
  border-radius: 20px;
  font-size: 0.9rem;
  animation: pop-in 0.5s ease backwards;
}

.feature:nth-child(1) { animation-delay: 0.1s; }
.feature:nth-child(2) { animation-delay: 0.2s; }
.feature:nth-child(3) { animation-delay: 0.3s; }
.feature:nth-child(4) { animation-delay: 0.4s; }

@keyframes pop-in {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.security-note {
  display: inline-block;
  text-align: left;
  padding: 1rem;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 8px;
  font-size: 0.85rem;
  max-width: 400px;
}

/* Spinner */
.spinner,
.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border-color: var(--vp-c-brand-1);
  border-top-color: transparent;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Dark mode adjustments */
.dark .code-textarea {
  background: #1a1a2e;
}

.dark .json-output {
  background: #1a1a2e;
}

/* Responsive */
@media (max-width: 640px) {
  .api-playground {
    margin: 1rem auto;
  }

  .playground-header {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .playground-title {
    font-size: 1.35rem;
  }

  .playground-subtitle {
    font-size: 0.85rem;
  }

  .stats-bar {
    width: 100%;
    justify-content: space-around;
    gap: 0.75rem;
  }

  .stat-value {
    font-size: 1rem;
  }

  .endpoint-display {
    flex-wrap: wrap;
  }

  .endpoint-input.model {
    width: 90px;
  }

  .endpoint-input.method {
    width: 80px;
  }

  .limit-input {
    width: 70px;
  }

  .template-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .method-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .domain-filter {
    flex-wrap: wrap;
  }

  .filter-field,
  .filter-operator,
  .filter-value {
    min-width: 0;
  }

  .not-connected-state {
    padding: 2rem 1rem;
  }

  .float {
    font-size: 2.5rem;
  }

  .not-connected-content h3 {
    font-size: 1.2rem;
  }
}

@media (max-width: 400px) {
  .template-grid,
  .method-grid {
    grid-template-columns: 1fr;
  }

  .playground-title {
    font-size: 1.15rem;
  }

  .stats-bar {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}
</style>
