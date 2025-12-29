<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useData } from 'vitepress'
import { usePersonalization } from '../composables/usePersonalization'

interface Command {
  id: string
  type: 'action' | 'page'
  icon: string
  title: string
  description?: string
  shortcut?: string
  action: () => void
  keywords: string[]
}

const isOpen = ref(false)
const query = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const { isDark } = useData()
const { settings, updateSetting, toggleSetting } = usePersonalization()

// Recent commands tracking
const recentCommands = ref<string[]>([])
const RECENT_STORAGE_KEY = 'odoo_training_recent_commands'

function loadRecentCommands() {
  if (typeof window === 'undefined') return
  try {
    const saved = localStorage.getItem(RECENT_STORAGE_KEY)
    if (saved) recentCommands.value = JSON.parse(saved)
  } catch (e) {
    recentCommands.value = []
  }
}

function trackCommand(id: string) {
  recentCommands.value = [id, ...recentCommands.value.filter(c => c !== id)].slice(0, 5)
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentCommands.value))
  } catch (e) {}
}

// All pages for search - comprehensive keywords for each section
const pages = [
  { id: 'page-home', path: '/', title: 'Home', description: 'Start page', keywords: ['home', 'start', 'index', 'welcome'] },
  { id: 'page-odoo', path: '/what-is-odoo', title: 'What is Odoo?', description: 'Technology stack & history', keywords: ['odoo', 'technology', 'stack', 'postgresql', 'python', 'owl', 'history', 'openerp', 'tinyerp'] },
  { id: 'page-intro', path: '/introduction', title: 'Introduction', description: 'Getting started guide', keywords: ['intro', 'begin', 'philosophy', 'start', 'guide'] },
  { id: 'page-models', path: '/01-models', title: 'Models', description: 'Database tables & ORM', keywords: ['model', 'database', 'table', 'orm', 'res.partner', 'sale.order', 'product'] },
  { id: 'page-fields', path: '/02-field-types', title: 'Field Types', description: 'Char, Integer, Selection...', keywords: ['field', 'char', 'integer', 'boolean', 'selection', 'text', 'float', 'date', 'datetime', 'binary', 'html'] },
  { id: 'page-relations', path: '/03-relationships', title: 'Relationships', description: 'Many2one, One2many, Many2many', keywords: ['many2one', 'one2many', 'many2many', 'relation', 'foreign key', 'link', 'reference'] },
  { id: 'page-storage', path: '/04-storage', title: 'Field Storage', description: 'Stored vs computed fields', keywords: ['store', 'storage', 'database', 'stored', 'transient'] },
  { id: 'page-computed', path: '/05-computed', title: 'Computed Fields', description: 'Automatic calculations', keywords: ['compute', 'depends', 'calculate', 'automatic', 'formula', 'onchange'] },
  { id: 'page-related', path: '/06-related', title: 'Related Fields', description: 'Field delegation', keywords: ['related', 'delegation', 'inherited', 'shortcut'] },
  { id: 'page-groupby', path: '/07-groupby', title: 'Group By & Stored Fields', description: 'Aggregation & pivots', keywords: ['group', 'aggregate', 'pivot', 'sum', 'count', 'average', 'reporting'] },
  { id: 'page-views', path: '/08-views', title: 'Views', description: 'Form, List, Kanban, Graph...', keywords: ['view', 'form', 'list', 'kanban', 'tree', 'graph', 'calendar', 'gantt', 'pivot', 'xml'] },
  { id: 'page-widgets', path: '/09-widgets', title: 'Widgets', description: 'UI display components', keywords: ['widget', 'display', 'statusbar', 'progressbar', 'badge', 'image', 'priority'] },
  { id: 'page-domains', path: '/10-domains', title: 'Domain Filters', description: 'Record filtering syntax', keywords: ['domain', 'filter', 'search', 'condition', 'operator', 'and', 'or'] },
  { id: 'page-properties', path: '/11-field-properties', title: 'Field Properties', description: 'Readonly, required, invisible...', keywords: ['property', 'readonly', 'required', 'invisible', 'attrs', 'states', 'groups'] },
  { id: 'page-access', path: '/12-access-rights', title: 'Access Rights', description: 'Security & permissions', keywords: ['security', 'permission', 'acl', 'record rules', 'ir.model.access', 'ir.rule', 'groups'] },
  { id: 'page-workflows', path: '/13-workflows', title: 'Workflows', description: 'State management', keywords: ['workflow', 'state', 'status', 'stage', 'transition', 'draft', 'confirm', 'done'] },
  { id: 'page-actions', path: '/14-actions', title: 'Actions', description: 'Server actions & automation', keywords: ['action', 'automation', 'server', 'scheduled', 'cron', 'automated', 'trigger'] },
  { id: 'page-integration', path: '/15-integration', title: 'Integration', description: 'APIs & external systems', keywords: ['api', 'xml-rpc', 'json-rpc', 'external', 'integration', 'webhook', 'rest'] },
  { id: 'page-studio', path: '/16-studio', title: 'Odoo Studio', description: 'No-code customization', keywords: ['studio', 'customize', 'no-code', 'low-code', 'drag', 'drop', 'enterprise'] },
  { id: 'page-performance', path: '/17-performance', title: 'Performance', description: 'Optimization tips', keywords: ['performance', 'speed', 'optimization', 'slow', 'fast', 'cache', 'prefetch', 'index'] },
  { id: 'page-decision', path: '/18-decision-matrix', title: 'Decision Matrix', description: 'When to use what', keywords: ['decision', 'when', 'choose', 'matrix', 'comparison', 'vs'] },
  { id: 'page-examples', path: '/19-examples', title: 'Real-World Examples', description: 'Practical scenarios', keywords: ['example', 'scenario', 'case', 'real', 'practical', 'use case'] },
  { id: 'page-mistakes', path: '/20-mistakes', title: 'Common Mistakes', description: 'Pitfalls to avoid', keywords: ['mistake', 'error', 'avoid', 'pitfall', 'wrong', 'common', 'bug'] },
  { id: 'page-odoosh', path: '/21-odoosh', title: 'Odoo.sh', description: 'Cloud platform', keywords: ['odoosh', 'cloud', 'hosting', 'deploy', 'git', 'staging', 'production', 'paas'] },
  { id: 'page-chatter', path: '/22-chatter', title: 'Chatter', description: 'Messages & activities', keywords: ['chatter', 'message', 'follower', 'activity', 'mail', 'thread', 'note', 'log'] },
  { id: 'page-email', path: '/23-email', title: 'Email', description: 'SMTP & templates', keywords: ['email', 'mail', 'smtp', 'template', 'outgoing', 'incoming', 'fetchmail'] },
  { id: 'page-context', path: '/24-context', title: 'Context', description: 'Parameters & defaults', keywords: ['context', 'default', 'parameter', 'lang', 'tz', 'active_id', 'search_default'] },
  { id: 'page-constraints', path: '/25-constraints', title: 'Constraints', description: 'Validation rules', keywords: ['constraint', 'validation', 'check', 'sql', 'python', 'unique', 'required'] },
  { id: 'page-ai', path: '/26-ai', title: 'AI in Odoo 19', description: 'Enterprise AI features', keywords: ['ai', 'artificial', 'intelligence', 'enterprise', 'machine learning', 'gpt', 'copilot'] },
  { id: 'page-edi', path: '/27-edi', title: 'EDI Order Exchange', description: 'UBL & Peppol', keywords: ['edi', 'ubl', 'peppol', 'electronic', 'invoice', 'order', 'exchange', 'b2b'] },
  { id: 'page-removal', path: '/28-removal-strategies', title: 'Removal Strategies', description: 'FIFO, LIFO, FEFO', keywords: ['removal', 'fifo', 'lifo', 'fefo', 'inventory', 'warehouse', 'stock', 'picking'] },
]

function toggleDarkMode() {
  const htmlEl = document.documentElement
  const currentIsDark = htmlEl.classList.contains('dark')
  htmlEl.classList.toggle('dark', !currentIsDark)
  localStorage.setItem('vitepress-theme-appearance', currentIsDark ? 'light' : 'dark')
  close()
}

function toggleFocusMode() {
  toggleSetting('focusMode')
  close()
}

function showKeyboardHelp() {
  close()
  nextTick(() => {
    document.dispatchEvent(new CustomEvent('show-keyboard-help'))
  })
}

function cycleFontSize(direction: number) {
  const sizes = ['small', 'normal', 'large', 'xlarge']
  const currentIndex = sizes.indexOf(settings.fontSize || 'normal')
  const newIndex = Math.max(0, Math.min(sizes.length - 1, currentIndex + direction))
  updateSetting('fontSize', sizes[newIndex])
  close()
}

function navigateTo(path: string) {
  close()
  const base = import.meta.env.BASE_URL || '/odoo-training/'
  const fullPath = path.startsWith('/') ? `${base.replace(/\/$/, '')}${path}` : path
  window.location.href = fullPath
}

// Action commands (non-navigation)
const actionCommands: Command[] = [
  {
    id: 'dark-mode',
    type: 'action',
    icon: '🌓',
    title: 'Toggle Dark Mode',
    shortcut: 'D',
    action: toggleDarkMode,
    keywords: ['dark', 'light', 'theme', 'mode', 'night']
  },
  {
    id: 'focus-mode',
    type: 'action',
    icon: '📖',
    title: 'Toggle Focus Mode',
    shortcut: 'F',
    action: toggleFocusMode,
    keywords: ['focus', 'reading', 'distraction', 'zen']
  },
  {
    id: 'top',
    type: 'action',
    icon: '⬆️',
    title: 'Back to Top',
    action: () => { close(); window.scrollTo({ top: 0, behavior: 'smooth' }) },
    keywords: ['top', 'scroll', 'up', 'beginning']
  },
  {
    id: 'keyboard',
    type: 'action',
    icon: '⌨️',
    title: 'Keyboard Shortcuts',
    shortcut: '?',
    action: showKeyboardHelp,
    keywords: ['keyboard', 'shortcuts', 'help', 'keys']
  },
  {
    id: 'font-up',
    type: 'action',
    icon: '🔠',
    title: 'Increase Font Size',
    action: () => cycleFontSize(1),
    keywords: ['font', 'larger', 'bigger', 'text', 'zoom']
  },
  {
    id: 'font-down',
    type: 'action',
    icon: '🔡',
    title: 'Decrease Font Size',
    action: () => cycleFontSize(-1),
    keywords: ['font', 'smaller', 'text', 'zoom']
  },
  {
    id: 'print',
    type: 'action',
    icon: '🖨️',
    title: 'Print Page',
    action: () => { close(); window.print() },
    keywords: ['print', 'pdf', 'export']
  },
]

// Page commands (navigation)
const pageCommands: Command[] = pages.map(page => ({
  id: page.id,
  type: 'page',
  icon: '📄',
  title: page.title,
  description: page.description,
  action: () => navigateTo(page.path),
  keywords: page.keywords
}))

const allCommands = [...actionCommands, ...pageCommands]

// Fuzzy matching score
function getMatchScore(text: string, query: string): number {
  const textLower = text.toLowerCase()
  const queryLower = query.toLowerCase()

  if (textLower === queryLower) return 1000
  if (textLower.startsWith(queryLower)) return 800
  if (textLower.includes(queryLower)) return 600

  // Word boundary match
  const words = textLower.split(/\s+/)
  for (const word of words) {
    if (word.startsWith(queryLower)) return 500
  }

  return 0
}

// Filtered and sorted commands
const filteredCommands = computed(() => {
  if (!query.value.trim()) {
    // Show recent commands first, then all actions
    const recent = recentCommands.value
      .map(id => allCommands.find(c => c.id === id))
      .filter((c): c is Command => c !== undefined)
    const actions = actionCommands.filter(c => !recent.some(r => r.id === c.id))
    return [...recent, ...actions].slice(0, 10)
  }

  const q = query.value.toLowerCase().trim()

  const scored = allCommands.map(cmd => {
    let score = 0

    // Title match (highest priority)
    score = Math.max(score, getMatchScore(cmd.title, q))

    // Description match
    if (cmd.description) {
      score = Math.max(score, getMatchScore(cmd.description, q) * 0.8)
    }

    // Keyword match
    for (const keyword of cmd.keywords) {
      const keywordScore = getMatchScore(keyword, q) * 0.7
      score = Math.max(score, keywordScore)
    }

    return { ...cmd, score }
  })
  .filter(cmd => cmd.score > 0)
  .sort((a, b) => {
    // Sort by score, then by type (actions first), then alphabetically
    if (b.score !== a.score) return b.score - a.score
    if (a.type !== b.type) return a.type === 'action' ? -1 : 1
    return a.title.localeCompare(b.title)
  })
  .slice(0, 12)

  return scored
})

function open() {
  isOpen.value = true
  query.value = ''
  selectedIndex.value = 0
  loadRecentCommands()
  nextTick(() => inputRef.value?.focus())
}

function close() {
  isOpen.value = false
  query.value = ''
}

function executeCommand(cmd: Command) {
  trackCommand(cmd.id)
  cmd.action()
}

function handleKeydown(e: KeyboardEvent) {
  // Handle Cmd/Ctrl+K to open command palette
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
    if (!isOpen.value) {
      open()
    } else {
      close()
    }
    return
  }

  // Only handle other keys when palette is open
  if (!isOpen.value) return

  switch (e.key) {
    case 'Escape':
      e.preventDefault()
      close()
      break
    case 'ArrowDown':
      e.preventDefault()
      selectedIndex.value = Math.min(selectedIndex.value + 1, filteredCommands.value.length - 1)
      break
    case 'ArrowUp':
      e.preventDefault()
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
      break
    case 'Enter':
      e.preventDefault()
      if (filteredCommands.value[selectedIndex.value]) {
        executeCommand(filteredCommands.value[selectedIndex.value])
      }
      break
    case 'Tab':
      e.preventDefault()
      if (e.shiftKey) {
        selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
      } else {
        selectedIndex.value = Math.min(selectedIndex.value + 1, filteredCommands.value.length - 1)
      }
      break
  }
}

// Reset selection when query changes
watch(query, () => {
  selectedIndex.value = 0
})

onMounted(() => {
  // Use capture phase to intercept before VitePress search
  document.addEventListener('keydown', handleKeydown, true)
  loadRecentCommands()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown, true)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="command-palette-overlay" @click="close">
        <div class="command-palette" @click.stop>
          <div class="command-input-wrapper">
            <span class="command-input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
            <input
              ref="inputRef"
              v-model="query"
              type="text"
              class="command-input"
              placeholder="Search pages or type a command..."
            />
            <kbd class="command-shortcut-hint">esc</kbd>
          </div>

          <div class="command-results">
            <div v-if="filteredCommands.length === 0" class="command-empty">
              No results found for "{{ query }}"
            </div>

            <div v-if="!query && recentCommands.length > 0" class="command-group-title">
              Recent
            </div>

            <button
              v-for="(cmd, index) in filteredCommands"
              :key="cmd.id"
              class="command-item"
              :class="{ selected: index === selectedIndex }"
              @click="executeCommand(cmd)"
              @mouseenter="selectedIndex = index"
            >
              <span class="command-icon">{{ cmd.icon }}</span>
              <div class="command-content">
                <span class="command-title">{{ cmd.title }}</span>
                <span v-if="cmd.description" class="command-description">{{ cmd.description }}</span>
              </div>
              <span v-if="cmd.shortcut" class="command-shortcut">
                <kbd>{{ cmd.shortcut }}</kbd>
              </span>
              <span class="command-type" :class="cmd.type">{{ cmd.type }}</span>
            </button>
          </div>

          <div class="command-footer">
            <span><kbd>↑↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Open</span>
            <span><kbd>esc</kbd> Close</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.command-palette-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.command-palette {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  width: 100%;
  max-width: 560px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  margin: 0 16px;
}

.command-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.command-input-icon {
  color: var(--vp-c-text-3);
  flex-shrink: 0;
  display: flex;
}

.command-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  color: var(--vp-c-text-1);
  outline: none;
}

.command-input::placeholder {
  color: var(--vp-c-text-3);
}

.command-shortcut-hint {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  color: var(--vp-c-text-3);
  font-family: inherit;
}

.command-results {
  max-height: 360px;
  overflow-y: auto;
  padding: 6px;
}

.command-empty {
  padding: 24px;
  text-align: center;
  color: var(--vp-c-text-3);
  font-size: 14px;
}

.command-group-title {
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--vp-c-text-3);
}

.command-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-1);
  cursor: pointer;
  text-align: left;
  border-radius: 8px;
  transition: background 0.1s;
}

.command-item:hover,
.command-item.selected {
  background: var(--vp-c-bg-soft);
}

.command-item.selected {
  background: var(--vp-c-brand-soft);
}

.command-icon {
  font-size: 16px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.command-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.command-title {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-description {
  font-size: 12px;
  color: var(--vp-c-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-shortcut {
  flex-shrink: 0;
}

.command-shortcut kbd {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  font-family: inherit;
}

.command-type {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.command-type.action {
  background: var(--vp-c-indigo-soft);
  color: var(--vp-c-indigo-1);
}

.command-type.page {
  background: var(--vp-c-green-soft);
  color: var(--vp-c-green-1);
}

.command-footer {
  display: flex;
  gap: 16px;
  padding: 10px 16px;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.command-footer kbd {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 11px;
  font-family: inherit;
  margin-right: 4px;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .command-palette-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .command-palette {
    max-width: none;
    border-radius: 16px 16px 0 0;
    max-height: 70vh;
    margin: 0;
  }

  .command-shortcut-hint {
    display: none;
  }

  .command-footer {
    display: none;
  }

  .command-description {
    display: none;
  }
}
</style>
