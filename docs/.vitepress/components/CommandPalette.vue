<script setup lang="ts">
import localSearchIndex from '@localSearchIndex'
import MiniSearch, { type SearchResult } from 'minisearch'
import { ref, computed, onMounted, onUnmounted, nextTick, watch, shallowRef } from 'vue'
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

interface SearchRecord {
  id: string
  title: string
  titles: string[]
  text?: string
}

const isOpen = ref(false)
const query = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const { localeIndex, theme } = useData()
const { settings, updateSetting, toggleSetting } = usePersonalization()

const searchIndexData = shallowRef(localSearchIndex)
const searchIndex = shallowRef<MiniSearch<SearchRecord> | null>(null)
const isIndexLoading = ref(false)
const maxResults = 16

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

async function loadSearchIndex(): Promise<void> {
  if (typeof window === 'undefined') return
  if (isIndexLoading.value || searchIndex.value) return

  isIndexLoading.value = true
  try {
    const loader = searchIndexData.value[localeIndex.value]
    if (!loader) return
    const rawIndex = (await loader())?.default
    if (!rawIndex) return
    searchIndex.value = MiniSearch.loadJSON<SearchRecord>(rawIndex, {
      fields: ['title', 'titles', 'text'],
      storeFields: ['title', 'titles'],
      searchOptions: {
        fuzzy: 0.2,
        prefix: true,
        boost: { title: 4, text: 2, titles: 1 },
        ...(theme.value.search?.provider === 'local' &&
          theme.value.search.options?.miniSearch?.searchOptions)
      },
      ...(theme.value.search?.provider === 'local' &&
        theme.value.search.options?.miniSearch?.options)
    })
  } catch (error) {
    console.warn('Failed to load local search index:', error)
  } finally {
    isIndexLoading.value = false
  }
}

if (import.meta.hot) {
  import.meta.hot.accept('/@localSearchIndex', (mod) => {
    if (!mod?.default) return
    searchIndexData.value = mod.default
    searchIndex.value = null
    loadSearchIndex()
  })
}

watch(() => localeIndex.value, () => {
  searchIndex.value = null
  loadSearchIndex()
})

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

function resolvePath(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
    return path
  }
  const base = import.meta.env.BASE_URL || '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  if (path.startsWith(normalizedBase)) return path
  if (path.startsWith('/')) return `${normalizedBase.replace(/\/$/, '')}${path}`
  return `${normalizedBase}${path}`
}

function navigateTo(path: string) {
  close()
  window.location.href = resolvePath(path)
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

function buildActionMatches(queryText: string): Command[] {
  const scored = actionCommands.map(cmd => {
    let score = getMatchScore(cmd.title, queryText)

    for (const keyword of cmd.keywords) {
      score = Math.max(score, getMatchScore(keyword, queryText) * 0.8)
    }

    return { cmd, score }
  })

  return scored
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.cmd)
}

function buildPageMatches(queryText: string): Command[] {
  if (!searchIndex.value) return []

  const results = searchIndex.value.search(queryText) as Array<SearchResult & SearchRecord>

  return results.slice(0, maxResults).map(result => {
    const title = result.title || result.titles?.[result.titles.length - 1] || 'Untitled'
    const description = result.titles?.length ? result.titles.join(' > ') : result.id
    return {
      id: result.id,
      type: 'page',
      icon: '📄',
      title,
      description,
      action: () => navigateTo(result.id),
      keywords: []
    }
  })
}

const isSearching = computed(() => query.value.trim().length > 0)
const isSearchReady = computed(() => !!searchIndex.value)

// Filtered and sorted commands
const filteredCommands = computed(() => {
  const q = query.value.trim()
  if (!q) {
    // Show recent commands first, then all actions
    const recent = recentCommands.value
      .map(id => actionCommands.find(c => c.id === id))
      .filter((c): c is Command => c !== undefined)
    const actions = actionCommands.filter(c => !recent.some(r => r.id === c.id))
    return [...recent, ...actions].slice(0, 10)
  }

  const pageMatches = buildPageMatches(q)
  const actionMatches = buildActionMatches(q)
  return [...pageMatches, ...actionMatches].slice(0, maxResults)
})

function open() {
  isOpen.value = true
  query.value = ''
  selectedIndex.value = 0
  loadRecentCommands()
  loadSearchIndex()
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
  if (query.value.trim() && !searchIndex.value) {
    loadSearchIndex()
  }
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
            <div v-if="isSearching && !isSearchReady && isIndexLoading" class="command-empty">
              Loading search index...
            </div>
            <div v-else-if="filteredCommands.length === 0" class="command-empty">
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
