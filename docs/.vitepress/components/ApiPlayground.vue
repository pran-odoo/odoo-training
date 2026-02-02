<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

// Connection state
const baseUrl = ref('')
const apiKey = ref('')
const showApiKey = ref(false)
const isConnected = ref(false)
const connectionStatus = ref<'idle' | 'testing' | 'success' | 'error'>('idle')
const copyFeedback = ref('')
const useProxy = ref(true) // Default to proxy for Odoo.com compatibility

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
const customDomain = ref<Array<[string, string, string]>>([])
const customRecordIds = ref('')

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

// Popular Odoo models
const popularModels = [
  'res.partner', 'res.users', 'product.product', 'product.template',
  'sale.order', 'sale.order.line', 'purchase.order', 'account.move',
  'stock.picking', 'stock.quant', 'crm.lead', 'project.project', 'project.task'
]

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

// Build custom request body based on selected method
const customRequestBody = computed(() => {
  const m = customMethod.value

  if (m === 'search_read') {
    return {
      domain: customDomain.value.length > 0 ? customDomain.value : [],
      fields: customFields.value,
      limit: customLimit.value
    }
  }

  if (m === 'search_count') {
    return {
      domain: customDomain.value.length > 0 ? customDomain.value : []
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
    return {
      name: '',
      domain: customDomain.value.length > 0 ? customDomain.value : [],
      limit: customLimit.value
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
  customDomain.value.push(['name', 'ilike', ''])
}

function removeDomainFilter(index: number) {
  customDomain.value.splice(index, 1)
}

function addField(field: string) {
  if (!customFields.value.includes(field)) {
    customFields.value.push(field)
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
        data: result.data || { error: 'Unexpected response format' },
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

  try {
    const start = performance.now()

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

function getRandomLoadingMessage(): string {
  return loadingMessages[Math.floor(Math.random() * loadingMessages.length)]
}

async function executeRequest() {
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

  error.value = ''
  response.value = null
  isLoading.value = true
  loadingMessage.value = getRandomLoadingMessage()

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
  setTimeout(() => { showConfetti.value = false }, 2000)
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

function clearHistory() {
  history.value = []
  stats.value = { calls: 0, successful: 0, fastest: 0 }
  streak.value = 0
}

function disconnect() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('odoo_playground_key')
    sessionStorage.removeItem('odoo_playground_url')
    // Keep proxy preference - user might want to reconnect with same mode
  }
  apiKey.value = ''
  baseUrl.value = ''
  isConnected.value = false
  connectionStatus.value = 'idle'
}
</script>

<template>
  <div class="api-playground" :class="{ 'success-pulse': showSuccessAnimation }">
    <!-- Confetti -->
    <div class="confetti-container" v-if="showConfetti">
      <div class="confetti" v-for="i in 50" :key="i" :style="{ '--i': i }"></div>
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
        <span class="connection-title">{{ isConnected ? 'Connected' : 'Connect to Odoo' }}</span>
        <button v-if="isConnected" class="disconnect-btn" @click="disconnect">Disconnect</button>
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
                    v-for="f in ['id', 'name', 'create_date', 'write_date', 'active']"
                    :key="f"
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
                <button class="add-filter-btn" @click="addDomainFilter">+ Add</button>
              </label>
              <div class="domain-filters">
                <div v-if="customDomain.length === 0" class="no-filters">
                  No filters - will return all records (up to limit)
                </div>
                <div
                  v-for="(filter, idx) in customDomain"
                  :key="idx"
                  class="domain-filter"
                >
                  <input
                    v-model="filter[0]"
                    class="filter-field"
                    placeholder="field"
                  />
                  <select v-model="filter[1]" class="filter-operator">
                    <option v-for="op in domainOperators" :key="op.value" :value="op.value">
                      {{ op.label }}
                    </option>
                  </select>
                  <input
                    v-model="filter[2]"
                    class="filter-value"
                    placeholder="value"
                  />
                  <button class="remove-filter-btn" @click="removeDomainFilter(idx)">🗑️</button>
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

          <div v-else-if="response" class="response-data">
            <button class="copy-btn floating" @click="copyToClipboard(formatJson(response))">
              📋 Copy
            </button>
            <pre class="json-output">{{ formatJson(response) }}</pre>
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

/* Confetti */
.confetti-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
}

.confetti {
  position: absolute;
  width: 10px;
  height: 10px;
  background: linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff);
  opacity: 0;
  animation: confetti-fall 2s ease-out forwards;
  animation-delay: calc(var(--i) * 0.02s);
  left: calc(var(--i) * 2%);
  transform: rotate(calc(var(--i) * 15deg));
}

.confetti:nth-child(odd) {
  background: #feca57;
  border-radius: 50%;
}

.confetti:nth-child(even) {
  background: #ff6b6b;
}

.confetti:nth-child(3n) {
  background: #48dbfb;
  width: 8px;
  height: 8px;
}

.confetti:nth-child(4n) {
  background: #ff9ff3;
}

.confetti:nth-child(5n) {
  background: #54a0ff;
  border-radius: 2px;
}

@keyframes confetti-fall {
  0% {
    opacity: 1;
    top: -10%;
    transform: translateX(0) rotate(0deg);
  }
  100% {
    opacity: 0;
    top: 100%;
    transform: translateX(calc((var(--i) - 25) * 10px)) rotate(720deg);
  }
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
  .playground-header {
    flex-direction: column;
    gap: 1rem;
  }

  .stats-bar {
    width: 100%;
    justify-content: space-around;
  }

  .endpoint-display {
    flex-wrap: wrap;
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
}
</style>
