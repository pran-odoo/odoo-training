import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vitepress'

export function useKeyboardShortcuts() {
  const router = useRouter()
  const focusModeActive = ref(false)
  const keyboardHelpOpen = ref(false)
  const commandPaletteOpen = ref(false)

  function isInputFocused(): boolean {
    const activeElement = document.activeElement as HTMLElement
    return activeElement?.matches('input, textarea, [contenteditable]') || false
  }

  function toggleDarkMode() {
    document.documentElement.classList.toggle('dark')
  }

  function toggleFocusMode() {
    focusModeActive.value = !focusModeActive.value
    document.body.classList.toggle('focus-mode', focusModeActive.value)
  }

  function navigateSection(direction: 'prev' | 'next') {
    const sidebar = document.querySelector('.VPSidebar')
    if (!sidebar) return

    const links = Array.from(sidebar.querySelectorAll('a.link'))
    const activeLink = sidebar.querySelector('a.link.active')

    if (!activeLink) {
      // If no active link, go to first/last
      const target = direction === 'next' ? links[0] : links[links.length - 1]
      if (target) (target as HTMLAnchorElement).click()
      return
    }

    const currentIndex = links.indexOf(activeLink)
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1

    if (nextIndex < 0) nextIndex = 0
    if (nextIndex >= links.length) nextIndex = links.length - 1

    const nextLink = links[nextIndex] as HTMLAnchorElement
    if (nextLink && nextIndex !== currentIndex) {
      nextLink.click()
    }
  }

  function focusSearch() {
    const searchBtn = document.querySelector('.VPNavBarSearch button') as HTMLButtonElement
    searchBtn?.click()
  }

  function handleKeydown(e: KeyboardEvent) {
    // Skip if in input (except for Escape)
    if (isInputFocused() && e.key !== 'Escape') return

    // Ctrl/Cmd + K - Command palette (handled by CommandPalette component)
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      return // Let CommandPalette handle this
    }

    // / - Focus search
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault()
      focusSearch()
      return
    }

    // D - Toggle dark mode
    if (e.key === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      toggleDarkMode()
      return
    }

    // F - Toggle focus mode
    if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      toggleFocusMode()
      return
    }

    // ? - Toggle keyboard help
    if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
      e.preventDefault()
      keyboardHelpOpen.value = !keyboardHelpOpen.value
      return
    }

    // Arrow keys for section navigation
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      navigateSection('prev')
      return
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault()
      navigateSection('next')
      return
    }

    // Escape - Exit focus mode or close modals
    if (e.key === 'Escape') {
      if (focusModeActive.value) {
        toggleFocusMode()
        return
      }
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })

  return {
    focusModeActive,
    keyboardHelpOpen,
    commandPaletteOpen,
    toggleDarkMode,
    toggleFocusMode,
    navigateSection,
    focusSearch
  }
}
