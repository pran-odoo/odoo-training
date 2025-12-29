<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter, useData } from 'vitepress'
import { usePersonalization } from '../composables/usePersonalization'

interface Command {
  id: string
  type: string
  icon: string
  title: string
  shortcut?: string
  action: () => void
  keywords: string[]
}

const isOpen = ref(false)
const query = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const router = useRouter()
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

// Navigation sections for command palette - matches sidebar routes in config.ts
const navSections = [
  { id: 'nav-home', path: '/', title: 'Home', keywords: ['home', 'start', 'index'] },
  { id: 'nav-odoo', path: '/what-is-odoo', title: 'What is Odoo?', keywords: ['odoo', 'technology', 'stack'] },
  { id: 'nav-intro', path: '/introduction', title: 'Introduction', keywords: ['intro', 'begin', 'philosophy'] },
  { id: 'nav-models', path: '/01-models', title: 'Models', keywords: ['model', 'database', 'table', 'orm'] },
  { id: 'nav-fields', path: '/02-field-types', title: 'Field Types', keywords: ['field', 'char', 'integer', 'boolean', 'selection'] },
  { id: 'nav-relations', path: '/03-relationships', title: 'Relationships', keywords: ['many2one', 'one2many', 'many2many', 'relation'] },
  { id: 'nav-storage', path: '/04-storage', title: 'Field Storage', keywords: ['store', 'storage', 'database'] },
  { id: 'nav-computed', path: '/05-computed', title: 'Computed Fields', keywords: ['compute', 'depends', 'calculate'] },
  { id: 'nav-related', path: '/06-related', title: 'Related Fields', keywords: ['related', 'delegation'] },
  { id: 'nav-groupby', path: '/07-groupby', title: 'Group By & Stored Fields', keywords: ['group', 'aggregate', 'pivot'] },
  { id: 'nav-views', path: '/08-views', title: 'Views', keywords: ['view', 'form', 'list', 'kanban', 'tree'] },
  { id: 'nav-widgets', path: '/09-widgets', title: 'Widgets', keywords: ['widget', 'display', 'statusbar'] },
  { id: 'nav-domains', path: '/10-domains', title: 'Domain Filters', keywords: ['domain', 'filter', 'search'] },
  { id: 'nav-properties', path: '/11-field-properties', title: 'Field Properties', keywords: ['property', 'readonly', 'required', 'invisible'] },
  { id: 'nav-access', path: '/12-access-rights', title: 'Access Rights', keywords: ['security', 'permission', 'acl', 'record rules'] },
  { id: 'nav-workflows', path: '/13-workflows', title: 'Workflows', keywords: ['workflow', 'state', 'status'] },
  { id: 'nav-actions', path: '/14-actions', title: 'Actions', keywords: ['action', 'automation', 'server'] },
  { id: 'nav-integration', path: '/15-integration', title: 'Integration', keywords: ['api', 'xml-rpc', 'json-rpc', 'external'] },
  { id: 'nav-studio', path: '/16-studio', title: 'Odoo Studio', keywords: ['studio', 'customize', 'no-code'] },
  { id: 'nav-performance', path: '/17-performance', title: 'Performance', keywords: ['performance', 'speed', 'optimization'] },
  { id: 'nav-decision', path: '/18-decision-matrix', title: 'Decision Matrix', keywords: ['decision', 'when', 'choose'] },
  { id: 'nav-examples', path: '/19-examples', title: 'Real-World Examples', keywords: ['example', 'scenario', 'case'] },
  { id: 'nav-mistakes', path: '/20-mistakes', title: 'Common Mistakes', keywords: ['mistake', 'error', 'avoid'] },
  { id: 'nav-odoosh', path: '/21-odoosh', title: 'Odoo.sh', keywords: ['odoosh', 'cloud', 'hosting', 'deploy'] },
  { id: 'nav-chatter', path: '/22-chatter', title: 'Chatter', keywords: ['chatter', 'message', 'follower', 'activity'] },
  { id: 'nav-email', path: '/23-email', title: 'Email', keywords: ['email', 'mail', 'smtp', 'template'] },
  { id: 'nav-context', path: '/24-context', title: 'Context', keywords: ['context', 'default', 'parameter'] },
  { id: 'nav-constraints', path: '/25-constraints', title: 'Constraints', keywords: ['constraint', 'validation', 'check'] },
  { id: 'nav-ai', path: '/26-ai', title: 'AI in Odoo 19', keywords: ['ai', 'artificial', 'intelligence', 'enterprise'] },
  { id: 'nav-edi', path: '/27-edi', title: 'EDI Order Exchange', keywords: ['edi', 'ubl', 'peppol', 'electronic'] },
  { id: 'nav-removal', path: '/28-removal-strategies', title: 'Removal Strategies', keywords: ['removal', 'fifo', 'lifo', 'fefo', 'inventory', 'warehouse'] },
]

function toggleDarkMode() {
  // Use VitePress's built-in appearance toggle
  // This properly persists the preference and syncs with useData().isDark
  const htmlEl = document.documentElement
  const currentIsDark = htmlEl.classList.contains('dark')
  htmlEl.classList.toggle('dark', !currentIsDark)
  // Persist to localStorage to sync with VitePress
  localStorage.setItem('vitepress-theme-appearance', currentIsDark ? 'light' : 'dark')
  close()
}

function toggleFocusMode() {
  // Use personalization state for persistence
  toggleSetting('focusMode')
  close()
}

function focusSearch() {
  close()
  nextTick(() => {
    const searchBtn = document.querySelector('.VPNavBarSearch button') as HTMLButtonElement
    searchBtn?.click()
  })
}

function searchContent(searchQuery?: string) {
  const q = searchQuery || query.value
  close()
  nextTick(() => {
    // Open VitePress search modal
    const searchBtn = document.querySelector('.VPNavBarSearch button') as HTMLButtonElement
    searchBtn?.click()
    // Wait for modal to open, then fill in the query
    setTimeout(() => {
      // VitePress 1.x uses .search-input class
      const searchInput = document.querySelector('.VPLocalSearchBox .search-input, .VPLocalSearchBox input') as HTMLInputElement
      if (searchInput && q) {
        // Focus the input first
        searchInput.focus()
        // Set the value using Object.getOwnPropertyDescriptor to trigger Vue reactivity
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(searchInput, q)
        } else {
          searchInput.value = q
        }
        // Dispatch input event to trigger Vue's v-model update
        searchInput.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }, 150)
  })
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
  // VitePress router.go expects a full path with base
  // Using window.location for reliable navigation
  const base = import.meta.env.BASE_URL || '/odoo-training/'
  const fullPath = path.startsWith('/') ? `${base.replace(/\/$/, '')}${path}` : path
  window.location.href = fullPath
}

// Command definitions - uses reactive state from VitePress and personalization
function getCommands(): Command[] {
  const actionCommands: Command[] = [
    {
      id: 'dark-mode',
      type: 'action',
      icon: isDark.value ? '☀️' : '🌙',
      title: isDark.value ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      shortcut: 'D',
      action: toggleDarkMode,
      keywords: ['dark', 'light', 'theme', 'mode', 'night']
    },
    {
      id: 'focus-mode',
      type: 'action',
      icon: settings.focusMode ? '📄' : '📖',
      title: settings.focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode',
      shortcut: 'F',
      action: toggleFocusMode,
      keywords: ['focus', 'reading', 'distraction', 'zen']
    },
    {
      id: 'search',
      type: 'action',
      icon: '🔍',
      title: 'Focus Search',
      shortcut: '/',
      action: focusSearch,
      keywords: ['search', 'find', 'lookup']
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

  const navCommands: Command[] = navSections.map(section => ({
    id: section.id,
    type: 'nav',
    icon: '📖',
    title: `Go to: ${section.title}`,
    action: () => navigateTo(section.path),
    keywords: section.keywords
  }))

  return [...actionCommands, ...navCommands]
}

// Computed that calls the function
const commands = computed(() => getCommands())

// Filtered and sorted commands
const filteredCommands = computed(() => {
  const allCommands = commands.value

  if (!query.value) {
    // Show recent commands first, then actions
    const recent = recentCommands.value
      .map(id => allCommands.find(c => c.id === id))
      .filter((c): c is Command => c !== undefined)
    const actions = allCommands.filter(c => c.type === 'action' && !recent.some(r => r.id === c.id))
    return [...recent, ...actions].slice(0, 12)
  }

  const q = query.value.toLowerCase()
  const matchedCommands = allCommands
    .map(cmd => {
      let score = 0
      const titleLower = cmd.title.toLowerCase()

      // Exact match
      if (titleLower === q) score = 1000
      // Starts with query
      else if (titleLower.startsWith(q)) score = 800
      // Contains query
      else if (titleLower.includes(q)) score = 600
      // Keyword match
      else if (cmd.keywords.some(k => k.includes(q))) score = 400
      // Partial keyword match
      else if (cmd.keywords.some(k => k.startsWith(q))) score = 300

      return { ...cmd, score }
    })
    .filter(cmd => cmd.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  // Always add a "Search content" option at the TOP when there's a query
  const searchContentCmd: Command = {
    id: 'search-content',
    type: 'search',
    icon: '🔎',
    title: `Search content for "${query.value}"`,
    action: () => searchContent(),
    keywords: []
  }

  // Put search content first so it's the default action
  return [searchContentCmd, ...matchedCommands]
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

// Reset selection when query changes - "Search content" is now always first
watch(query, () => {
  // "Search content" is always at index 0 when there's a query
  // So just reset to 0 - this makes Enter immediately search content
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
              placeholder="Type a command or search..."
            />
            <button class="command-close-mobile" @click="close" aria-label="Close">
              ×
            </button>
          </div>

          <div class="command-results">
            <div v-if="!query && recentCommands.length > 0" class="command-group">
              <div class="command-group-title">Recent</div>
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
              <span class="command-title">{{ cmd.title }}</span>
              <span v-if="cmd.shortcut" class="command-shortcut">
                <kbd>{{ cmd.shortcut }}</kbd>
              </span>
              <span class="command-type">{{ cmd.type }}</span>
            </button>

          </div>

          <div class="command-footer">
            <span><kbd>↑↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Select</span>
            <span><kbd>Esc</kbd> Close</span>
            <span v-if="query" class="footer-hint">Type to search content</span>
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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.command-palette {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  margin: 0 16px;
}

.command-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
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
  font-size: 16px;
  color: var(--vp-c-text-1);
  outline: none;
}

.command-input::placeholder {
  color: var(--vp-c-text-3);
}

.command-close-mobile {
  display: none;
  background: transparent;
  border: none;
  font-size: 24px;
  color: var(--vp-c-text-3);
  cursor: pointer;
}

.command-results {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
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
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-1);
  cursor: pointer;
  text-align: left;
  border-radius: 8px;
  transition: background 0.1s;
  font-size: 14px;
}

.command-item:hover,
.command-item.selected {
  background: var(--vp-c-bg-soft);
}

.command-item.selected {
  background: var(--vp-c-brand-soft);
}

.command-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.command-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-shortcut {
  margin-right: 8px;
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
  font-size: 11px;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.command-footer {
  display: flex;
  gap: 20px;
  padding: 12px 20px;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.footer-hint {
  margin-left: auto;
  color: var(--vp-c-brand-1);
  font-style: italic;
}

.command-footer kbd {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 2px 6px;
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
    max-height: 80vh;
    margin: 0;
  }

  .command-close-mobile {
    display: block;
  }

  .command-footer {
    display: none;
  }
}
</style>
