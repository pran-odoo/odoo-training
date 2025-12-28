<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useRoute } from 'vitepress'
import { onMounted, watch, ref, onUnmounted } from 'vue'
import { usePersonalization } from '../composables/usePersonalization'

// Components
import ProgressBar from '../components/ProgressBar.vue'
import SettingsPanel from '../components/SettingsPanel.vue'
import CommandPalette from '../components/CommandPalette.vue'
import BackToTop from '../components/BackToTop.vue'
import KeyboardHelp from '../components/KeyboardHelp.vue'
import ResumeReading from '../components/ResumeReading.vue'
import GlossaryProvider from '../components/GlossaryProvider.vue'
import LiquidBackground from '../components/LiquidBackground.vue'
import CustomFooter from '../components/CustomFooter.vue'

const { Layout } = DefaultTheme
const route = useRoute()
const { settings, applySettings, toggleSetting } = usePersonalization()

const keyboardHelpRef = ref<InstanceType<typeof KeyboardHelp> | null>(null)

// Apply settings on mount
onMounted(() => {
  applySettings()
  setupKeyboardShortcuts()

  // Listen for keyboard help event from command palette
  document.addEventListener('show-keyboard-help', () => {
    keyboardHelpRef.value?.open()
  })
})

// Re-apply when settings change
watch(settings, () => {
  applySettings()
}, { deep: true })

// Re-apply glossary when route changes
watch(() => route.path, () => {
  // Glossary will re-process on next tick
})

// Keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', handleKeydown)
}

function handleKeydown(e: KeyboardEvent) {
  // Skip if in input
  const target = e.target as HTMLElement
  if (target.matches('input, textarea, [contenteditable]')) return

  // Skip if any modal is open
  if (document.querySelector('.command-palette-overlay, .keyboard-help-overlay, .VPLocalSearchBox')) return

  const key = e.key.toLowerCase()

  // D - Toggle dark mode
  if (key === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
    e.preventDefault()
    const htmlEl = document.documentElement
    const currentIsDark = htmlEl.classList.contains('dark')
    htmlEl.classList.toggle('dark', !currentIsDark)
    localStorage.setItem('vitepress-theme-appearance', currentIsDark ? 'light' : 'dark')
    return
  }

  // F - Toggle focus mode
  if (key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
    e.preventDefault()
    toggleSetting('focusMode')
    return
  }

  // Arrow keys for navigation
  if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    navigateSection('prev')
    return
  }

  if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    navigateSection('next')
    return
  }

  // Escape - exit focus mode
  if (e.key === 'Escape' && settings.focusMode) {
    toggleSetting('focusMode')
    return
  }
}

function navigateSection(direction: 'prev' | 'next') {
  const sidebar = document.querySelector('.VPSidebar')
  if (!sidebar) return

  const links = Array.from(sidebar.querySelectorAll('a.link'))
  const activeLink = sidebar.querySelector('a.link.active')

  if (!activeLink) return

  const currentIndex = links.indexOf(activeLink)
  let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1

  if (nextIndex < 0 || nextIndex >= links.length) return

  const nextLink = links[nextIndex] as HTMLAnchorElement
  if (nextLink) {
    nextLink.click()
  }
}

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <LiquidBackground v-if="route.path === '/'" />
  <Layout>
    <template #layout-top>
      <ProgressBar />
    </template>

    <template #nav-bar-content-after>
      <SettingsPanel />
    </template>

    <template #layout-bottom>
      <CustomFooter />
      <CommandPalette />
      <BackToTop />
      <KeyboardHelp ref="keyboardHelpRef" />
      <ResumeReading />
      <GlossaryProvider />
    </template>
  </Layout>
</template>

<style>
/* Focus Mode Styles */
body.focus-mode .VPSidebar,
body.focus-mode .VPNavBar,
body.focus-mode .VPLocalNav,
body.focus-mode .VPFooter,
body.focus-mode .aside-container {
  display: none !important;
}

body.focus-mode .VPDoc {
  padding: 40px 20px !important;
}

body.focus-mode .VPContent {
  padding-left: 0 !important;
  padding-right: 0 !important;
}

body.focus-mode .vp-doc {
  max-width: 800px !important;
  margin: 0 auto !important;
}

/* Focus mode indicator */
body.focus-mode::after {
  content: 'Focus Mode (Press F or Esc to exit)';
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Eye Comfort Mode */
body.eye-comfort {
  filter: sepia(15%) saturate(90%);
}

/* High Contrast Mode */
body.high-contrast {
  --vp-c-text-1: #000;
  --vp-c-text-2: #333;
}

.dark body.high-contrast {
  --vp-c-text-1: #fff;
  --vp-c-text-2: #e0e0e0;
}

/* Animation Preferences */
body.animations-reduced * {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
}

body.animations-none * {
  animation: none !important;
  transition: none !important;
}

/* Density Options */
body.density-compact .vp-doc {
  font-size: 14px;
  line-height: 1.5;
}

body.density-compact .vp-doc p,
body.density-compact .vp-doc li {
  margin: 8px 0;
}

body.density-relaxed .vp-doc {
  font-size: 18px;
  line-height: 1.9;
}

body.density-relaxed .vp-doc p,
body.density-relaxed .vp-doc li {
  margin: 20px 0;
}

/* Link Styles */
body.links-always .vp-doc a {
  text-decoration: underline !important;
}

body.links-never .vp-doc a {
  text-decoration: none !important;
}

body.links-never .vp-doc a::after {
  display: none !important;
}

/* Font Size Classes */
body.font-small .vp-doc {
  font-size: 14px;
}

body.font-large .vp-doc {
  font-size: 18px;
}

body.font-xlarge .vp-doc {
  font-size: 20px;
}
</style>
