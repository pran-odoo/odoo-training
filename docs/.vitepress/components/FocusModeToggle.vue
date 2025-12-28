<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { usePersonalization } from '../composables/usePersonalization'

const { settings, toggleSetting } = usePersonalization()

const isActive = computed(() => settings.focusMode)

function toggle() {
  toggleSetting('focusMode')
}

function handleKeydown(e: KeyboardEvent) {
  // F key to toggle focus mode (when not in input)
  if (e.key === 'f' || e.key === 'F') {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
    if (e.ctrlKey || e.metaKey || e.altKey) return

    e.preventDefault()
    toggle()
  }

  // Escape to exit focus mode
  if (e.key === 'Escape' && isActive.value) {
    toggle()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <button
    class="focus-mode-btn"
    :class="{ active: isActive }"
    @click="toggle"
    :aria-pressed="isActive"
    title="Toggle focus mode (F)"
  >
    👁️
  </button>
</template>

<style scoped>
.focus-mode-btn {
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  font-size: 16px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1;
}

.focus-mode-btn:hover {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
}

.focus-mode-btn.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
}
</style>
