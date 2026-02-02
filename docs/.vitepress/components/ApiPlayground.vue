<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

// Connection state
const baseUrl = ref('')
const apiKey = ref('')
const showApiKey = ref(false)
const isConnected = ref(false)
const connectionStatus = ref<'idle' | 'testing' | 'success' | 'error'>('idle')

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
  custom: [
    {
      id: 'custom-empty',
      name: 'Empty Request',
      icon: '📝',
      model: 'res.partner',
      method: 'search_read',
      body: {
        domain: [],
        fields: ["name"],
        limit: 5
      }
    }
  ]
}

const categories = [
  { id: 'partners', name: 'Partners', icon: '👥' },
  { id: 'products', name: 'Products', icon: '📦' },
  { id: 'sales', name: 'Sales', icon: '🛒' },
  { id: 'invoices', name: 'Invoices', icon: '🧾' },
  { id: 'custom', name: 'Custom', icon: '⚙️' }
]

const currentTemplates = computed(() => templates[selectedCategory.value as keyof typeof templates] || [])

// Load saved connection from sessionStorage
onMounted(() => {
  const savedUrl = sessionStorage.getItem('odoo_playground_url')
  const savedKey = sessionStorage.getItem('odoo_playground_key')
  if (savedUrl) baseUrl.value = savedUrl
  if (savedKey) {
    apiKey.value = savedKey
    isConnected.value = true
  }
})

// Save connection to sessionStorage
watch([baseUrl, apiKey], () => {
  if (baseUrl.value) sessionStorage.setItem('odoo_playground_url', baseUrl.value)
  if (apiKey.value) sessionStorage.setItem('odoo_playground_key', apiKey.value)
})

function selectTemplate(template: typeof templates.partners[0]) {
  selectedTemplate.value = template.id
  model.value = template.model
  method.value = template.method
  requestBody.value = JSON.stringify(template.body, null, 2)
}

async function testConnection() {
  if (!baseUrl.value || !apiKey.value) return

  connectionStatus.value = 'testing'

  try {
    const url = `${baseUrl.value.replace(/\/$/, '')}/json/2/res.users/search_read`
    const start = performance.now()

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ domain: [["id", "=", 1]], fields: ["name"], limit: 1 })
    })

    const elapsed = performance.now() - start

    if (res.ok) {
      connectionStatus.value = 'success'
      isConnected.value = true
      responseTime.value = Math.round(elapsed)
    } else {
      connectionStatus.value = 'error'
      isConnected.value = false
    }
  } catch (e) {
    connectionStatus.value = 'error'
    isConnected.value = false
  }
}

async function executeRequest() {
  if (!baseUrl.value || !apiKey.value) {
    error.value = 'Please configure connection first'
    return
  }

  error.value = ''
  response.value = null
  isLoading.value = true

  const start = performance.now()

  try {
    let body: any
    try {
      body = JSON.parse(requestBody.value)
    } catch (e) {
      throw new Error('Invalid JSON in request body')
    }

    const url = `${baseUrl.value.replace(/\/$/, '')}/json/2/${model.value}/${method.value}`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const elapsed = Math.round(performance.now() - start)
    responseTime.value = elapsed
    responseStatus.value = res.status

    const data = await res.json()
    response.value = data

    // Update stats
    stats.value.calls++
    if (res.ok) {
      stats.value.successful++
      if (!stats.value.fastest || elapsed < stats.value.fastest) {
        stats.value.fastest = elapsed
      }
    }

    // Add to history
    history.value.unshift({
      id: Date.now(),
      model: model.value,
      method: method.value,
      status: res.status,
      time: elapsed,
      timestamp: new Date()
    })

    // Keep only last 10
    if (history.value.length > 10) history.value.pop()

  } catch (e: any) {
    error.value = e.message || 'Request failed'
    responseStatus.value = 0
  } finally {
    isLoading.value = false
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

function formatJson(obj: any): string {
  return JSON.stringify(obj, null, 2)
}

function clearHistory() {
  history.value = []
  stats.value = { calls: 0, successful: 0, fastest: 0 }
}

function disconnect() {
  sessionStorage.removeItem('odoo_playground_key')
  apiKey.value = ''
  isConnected.value = false
  connectionStatus.value = 'idle'
}
</script>

<template>
  <div class="api-playground">
    <!-- Header -->
    <div class="playground-header">
      <div class="header-content">
        <h2 class="playground-title">
          <span class="title-icon">🚀</span>
          API Playground
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
      </div>
    </div>

    <!-- Connection Panel -->
    <div class="connection-panel" :class="{ connected: isConnected }">
      <div class="connection-header">
        <span class="connection-icon">{{ isConnected ? '🔗' : '🔌' }}</span>
        <span class="connection-title">{{ isConnected ? 'Connected' : 'Connect to Odoo' }}</span>
        <button v-if="isConnected" class="disconnect-btn" @click="disconnect">Disconnect</button>
      </div>

      <div class="connection-form" v-if="!isConnected">
        <div class="form-row">
          <label class="form-label">Odoo URL</label>
          <input
            v-model="baseUrl"
            type="url"
            class="form-input"
            placeholder="https://your-odoo.com"
          />
        </div>

        <div class="form-row">
          <label class="form-label">API Key</label>
          <div class="input-with-toggle">
            <input
              v-model="apiKey"
              :type="showApiKey ? 'text' : 'password'"
              class="form-input"
              placeholder="odoo_api_xxxxxxxx..."
            />
            <button class="toggle-visibility" @click="showApiKey = !showApiKey">
              {{ showApiKey ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <button
          class="test-connection-btn"
          :class="connectionStatus"
          :disabled="!baseUrl || !apiKey || connectionStatus === 'testing'"
          @click="testConnection"
        >
          <span v-if="connectionStatus === 'testing'" class="spinner"></span>
          <span v-else-if="connectionStatus === 'success'">✓ Connected</span>
          <span v-else-if="connectionStatus === 'error'">✗ Failed - Retry</span>
          <span v-else>Test Connection</span>
        </button>

        <div class="cors-warning">
          <strong>Note:</strong> Your Odoo instance must allow CORS from this domain,
          or use a browser extension to bypass CORS for testing.
        </div>
      </div>
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

        <div class="template-grid">
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
              📋
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
            <span>Sending request...</span>
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
            <span class="empty-icon">📭</span>
            <span>Execute a request to see the response</span>
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
        <span class="not-connected-icon">🔐</span>
        <h3>Connect to Start Testing</h3>
        <p>Enter your Odoo URL and API key above to start making API calls.</p>
        <div class="security-note">
          <strong>🛡️ Security:</strong> Your credentials are stored only in your browser's session
          and are sent directly to your Odoo instance. We never see or store your API keys.
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
}

/* Header */
.playground-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
  border-radius: 16px;
  border: 1px solid rgba(99, 102, 241, 0.2);
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
  margin-bottom: 1rem;
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

.test-connection-btn {
  padding: 0.75rem 1.5rem;
  background: var(--vp-c-brand-1);
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
  background: var(--vp-c-brand-2);
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

.cors-warning {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  padding: 0.75rem;
  background: rgba(251, 191, 36, 0.1);
  border-radius: 6px;
  border-left: 3px solid #fbbf24;
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

.not-connected-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 1rem;
}

.not-connected-content h3 {
  margin: 0 0 0.5rem;
}

.not-connected-content p {
  color: var(--vp-c-text-2);
  margin: 0 0 1.5rem;
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
}
</style>
