<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isOpen = ref(false)

const shortcuts = [
  { keys: ['Ctrl', 'K'], description: 'Open command palette' },
  { keys: ['/'], description: 'Focus search' },
  { keys: ['D'], description: 'Toggle dark mode' },
  { keys: ['F'], description: 'Toggle focus mode' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
  { keys: ['←'], description: 'Previous section' },
  { keys: ['→'], description: 'Next section' },
  { keys: ['Esc'], description: 'Close modals / Exit focus mode' },
  { keys: ['↑', '↓'], description: 'Navigate search results' },
  { keys: ['Enter'], description: 'Select search result' },
]

function open() {
  isOpen.value = true
}

function close() {
  isOpen.value = false
}

function handleKeydown(e: KeyboardEvent) {
  // Ignore if in input
  if ((e.target as HTMLElement).matches('input, textarea, [contenteditable]')) return

  if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
    e.preventDefault()
    isOpen.value = !isOpen.value
  }

  if (e.key === 'Escape' && isOpen.value) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// Expose for external use
defineExpose({ open, close })
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="keyboard-help-overlay" @click="close">
      <div class="keyboard-help" @click.stop>
        <div class="keyboard-help-header">
          <h2>Keyboard Shortcuts</h2>
          <button class="close-btn" @click="close" aria-label="Close">×</button>
        </div>
        <div class="keyboard-help-content">
          <div
            v-for="shortcut in shortcuts"
            :key="shortcut.description"
            class="shortcut-row"
          >
            <div class="shortcut-keys">
              <kbd v-for="key in shortcut.keys" :key="key">{{ key }}</kbd>
            </div>
            <div class="shortcut-description">{{ shortcut.description }}</div>
          </div>
        </div>
        <div class="keyboard-help-footer">
          Press <kbd>?</kbd> to toggle this help
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.keyboard-help-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.keyboard-help {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  width: 100%;
  max-width: 420px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.keyboard-help-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.keyboard-help-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--vp-c-text-2);
  line-height: 1;
  padding: 4px;
}

.close-btn:hover {
  color: var(--vp-c-text-1);
}

.keyboard-help-content {
  padding: 16px 20px;
  overflow-y: auto;
  max-height: 400px;
}

.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.shortcut-row:last-child {
  border-bottom: none;
}

.shortcut-keys {
  display: flex;
  gap: 6px;
}

.shortcut-keys kbd {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-family: inherit;
  min-width: 24px;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.shortcut-description {
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.keyboard-help-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--vp-c-divider);
  text-align: center;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.keyboard-help-footer kbd {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  font-family: inherit;
}

@media (max-width: 480px) {
  .keyboard-help {
    max-width: calc(100vw - 32px);
    max-height: 70vh;
  }

  .keyboard-help-content {
    max-height: 50vh;
  }

  .keyboard-help-header {
    padding: 12px 16px;
  }

  .keyboard-help-content {
    padding: 12px 16px;
  }

  .keyboard-help-footer {
    padding: 10px 16px;
  }
}
</style>
