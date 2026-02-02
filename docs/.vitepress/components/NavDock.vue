<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useData } from 'vitepress'
import { useBookmarks } from '../composables/useBookmarks'

const router = useRouter()
const { isDark, page } = useData()
const { isBookmarked, toggleBookmark } = useBookmarks()

// Current page path for bookmarking
const currentPath = computed(() => page.value.relativePath.replace(/\.md$/, ''))

// Mouse position for magnetic effect
const mouseX = ref<number | null>(null)
const dockRef = ref<HTMLElement | null>(null)

// Configuration - named constants instead of magic numbers
const CONFIG = {
  baseSize: 42,
  maxSize: 58,
  magnetDistance: 140,
  itemGap: 8,
  containerPadding: 16,
  rectCacheTTL: 100, // ms
  throttleMs: 16 // ~60fps
} as const

// Reactive state for caching (not module-level)
const cachedDockRect = ref<DOMRect | null>(null)
const rectCacheTime = ref(0)
const lastMouseMove = ref(0)

// Platform detection for keyboard shortcut display
const isMac = ref(false)
onMounted(() => {
  isMac.value = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
})

// SVG paths as constants
const ICONS = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  guide: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  sun: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
  moon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
  github: 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z',
  keyboard: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  bookmark: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z',
  bookmarkFilled: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
} as const

interface DockItem {
  id: string
  label: string
  action: () => void
  iconPath: string | (() => string)
  isFilled?: boolean
}

// Reactive icon paths
const themeIconPath = computed(() => isDark.value ? ICONS.sun : ICONS.moon)
const bookmarkIconPath = computed(() => isBookmarked(currentPath.value) ? ICONS.bookmarkFilled : ICONS.bookmark)
const isCurrentPageBookmarked = computed(() => isBookmarked(currentPath.value))

// Items as computed for reactive labels
const items = computed<DockItem[]>(() => [
  {
    id: 'home',
    label: 'Home',
    action: () => router.go('/'),
    iconPath: ICONS.home
  },
  {
    id: 'guide',
    label: 'Guide',
    action: () => router.go('/01-introduction'),
    iconPath: ICONS.guide
  },
  {
    id: 'search',
    label: `Search (${isMac.value ? '⌘' : 'Ctrl'}+K)`,
    action: openSearch,
    iconPath: ICONS.search
  },
  {
    id: 'bookmark',
    label: isCurrentPageBookmarked.value ? 'Remove Bookmark (B)' : 'Bookmark Page (B)',
    action: () => {
      // Click the existing bookmark button for reliability
      const btn = document.querySelector('.bookmark-btn') as HTMLButtonElement
      btn?.click()
    },
    iconPath: () => bookmarkIconPath.value,
    isFilled: isCurrentPageBookmarked.value
  },
  {
    id: 'theme',
    label: 'Toggle Theme (D)',
    action: toggleTheme,
    iconPath: () => themeIconPath.value
  },
  {
    id: 'settings',
    label: 'Settings',
    action: () => {
      // Click the existing settings button for reliability
      const btn = document.querySelector('.settings-toggle') as HTMLButtonElement
      btn?.click()
    },
    iconPath: ICONS.settings
  },
  {
    id: 'keyboard',
    label: 'Keyboard Help (?)',
    action: () => document.dispatchEvent(new CustomEvent('show-keyboard-help')),
    iconPath: ICONS.keyboard
  },
  {
    id: 'github',
    label: 'GitHub',
    action: openGitHub,
    iconPath: ICONS.github,
    isFilled: true
  }
])

function toggleTheme() {
  const html = document.documentElement
  const currentIsDark = html.classList.contains('dark')
  html.classList.toggle('dark', !currentIsDark)
  localStorage.setItem('vitepress-theme-appearance', currentIsDark ? 'light' : 'dark')
}

function openGitHub() {
  window.open('https://github.com/pran-odoo/odoo-training', '_blank', 'noopener,noreferrer')
}

function openSearch() {
  const searchBtn = document.querySelector('.VPNavBarSearch button, .DocSearch-Button') as HTMLButtonElement
  searchBtn?.click()
}

// Calculate item size based on mouse position
function calculateItemSize(index: number, dockRect: DOMRect | null): number {
  if (mouseX.value === null || !dockRect) return CONFIG.baseSize

  const itemWidth = CONFIG.baseSize + CONFIG.itemGap
  const itemCenter = dockRect.left + CONFIG.containerPadding + (index + 0.5) * itemWidth
  const dist = Math.abs(mouseX.value - itemCenter)

  if (dist > CONFIG.magnetDistance) return CONFIG.baseSize

  const scale = 1 - (dist / CONFIG.magnetDistance)
  return CONFIG.baseSize + (CONFIG.maxSize - CONFIG.baseSize) * scale * scale
}

// Computed item sizes - reads cached rect without side effects
const itemSizes = computed(() => {
  const dockRect = cachedDockRect.value
  return items.value.map((_, index) => calculateItemSize(index, dockRect))
})

// Get icon path - handles both static strings and reactive getters
function getIconPath(item: DockItem): string {
  return typeof item.iconPath === 'function' ? item.iconPath() : item.iconPath
}

// Update dock rect cache
function updateDockRect() {
  if (!dockRef.value) return

  const now = Date.now()
  if (now - rectCacheTime.value < CONFIG.rectCacheTTL) return

  cachedDockRect.value = dockRef.value.getBoundingClientRect()
  rectCacheTime.value = now
}

// Throttled mouse move handler
function handleMouseMove(e: MouseEvent) {
  const now = Date.now()
  if (now - lastMouseMove.value < CONFIG.throttleMs) return
  lastMouseMove.value = now

  // Update cache before updating mouse position
  updateDockRect()
  mouseX.value = e.clientX
}

function handleMouseLeave() {
  mouseX.value = null
  cachedDockRect.value = null // Clear cache on leave
}

// Handle keyboard navigation
function handleKeydown(e: KeyboardEvent, item: DockItem) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    item.action()
  }
}

// Cleanup on unmount
onUnmounted(() => {
  cachedDockRect.value = null
  mouseX.value = null
})
</script>

<template>
  <nav
    ref="dockRef"
    class="nav-dock"
    role="navigation"
    aria-label="Quick navigation"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <div class="dock-container">
      <button
        v-for="(item, index) in items"
        :key="item.id"
        class="dock-item"
        :style="{
          '--item-size': `${itemSizes[index]}px`
        }"
        :aria-label="item.label"
        :title="item.label"
        @click="item.action"
        @keydown="(e) => handleKeydown(e, item)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="dock-icon"
          viewBox="0 0 24 24"
          :fill="item.isFilled ? 'currentColor' : 'none'"
          :stroke="item.isFilled ? 'none' : 'currentColor'"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path :d="getIconPath(item)" />
        </svg>
        <span class="dock-tooltip" role="tooltip">{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.nav-dock {
  display: flex;
  align-items: center;
  justify-content: center;
}

.dock-container {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(10, 10, 20, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.dark .dock-container {
  background: rgba(0, 0, 10, 0.9);
  border-color: rgba(255, 255, 255, 0.08);
}

.dock-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--item-size, 42px);
  height: var(--item-size, 42px);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  cursor: pointer;
  transition:
    width 0.15s cubic-bezier(0.33, 1, 0.68, 1),
    height 0.15s cubic-bezier(0.33, 1, 0.68, 1),
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  color: rgba(255, 255, 255, 0.8);
}

.dock-item:hover,
.dock-item:focus-visible {
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  border-color: transparent;
  color: white;
  box-shadow:
    0 4px 20px rgba(99, 102, 241, 0.4),
    0 0 0 1px rgba(99, 102, 241, 0.2);
  outline: none;
}

.dock-item:focus-visible {
  box-shadow:
    0 4px 20px rgba(99, 102, 241, 0.4),
    0 0 0 2px var(--vp-c-brand-1);
}

.dock-item:active {
  transform: scale(0.95);
}

.dock-icon {
  width: 50%;
  height: 50%;
  transition: transform 0.15s ease;
  flex-shrink: 0;
}

.dock-item:hover .dock-icon,
.dock-item:focus-visible .dock-icon {
  transform: scale(1.1);
}

.dock-tooltip {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%) translateY(8px);
  padding: 6px 12px;
  background: rgba(0, 0, 10, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  pointer-events: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 100;
}

.dock-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: rgba(0, 0, 10, 0.95);
}

.dock-item:hover .dock-tooltip,
.dock-item:focus-visible .dock-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}

/* Light mode adjustments */
:root:not(.dark) .dock-container {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

:root:not(.dark) .dock-item {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.02));
  border-color: rgba(0, 0, 0, 0.1);
  color: rgba(0, 0, 0, 0.7);
}

:root:not(.dark) .dock-item:hover,
:root:not(.dark) .dock-item:focus-visible {
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: white;
  box-shadow:
    0 4px 16px rgba(79, 70, 229, 0.35),
    0 0 0 1px rgba(79, 70, 229, 0.15);
}

:root:not(.dark) .dock-tooltip {
  background: rgba(30, 30, 40, 0.95);
}

:root:not(.dark) .dock-tooltip::after {
  border-top-color: rgba(30, 30, 40, 0.95);
}

/* Responsive */
@media (max-width: 768px) {
  .dock-container {
    gap: 6px;
    padding: 6px 12px;
  }

  .dock-tooltip {
    display: none;
  }
}
</style>
