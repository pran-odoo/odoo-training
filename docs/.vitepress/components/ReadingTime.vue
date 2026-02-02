<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()
const readingTime = ref(0)
const wordCount = ref(0)

// Average reading speed (words per minute)
const WORDS_PER_MINUTE = 200

// Track timeout for cleanup
let timeoutId: ReturnType<typeof setTimeout> | null = null

function calculateReadingTime() {
  // Clear any pending timeout to prevent race conditions
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }

  // Use nextTick to ensure DOM is updated, then small delay for VitePress hydration
  nextTick(() => {
    timeoutId = setTimeout(() => {
      const content = document.querySelector('.vp-doc')
      if (!content) return

      // Clone content and remove non-readable elements for accurate reading time
      const clone = content.cloneNode(true) as HTMLElement
      clone.querySelectorAll(
        'pre, code, .line-numbers, .header-anchor, .custom-block-title, .copy, .lang, nav, .table-of-contents'
      ).forEach(el => el.remove())

      const text = clone.textContent || ''
      const words = text.trim().split(/\s+/).filter(word => word.length > 0).length

      wordCount.value = words
      readingTime.value = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
      timeoutId = null
    }, 50)
  })
}

onMounted(() => {
  calculateReadingTime()
})

onUnmounted(() => {
  // Cleanup timeout on unmount to prevent memory leaks
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
})

// Recalculate when route changes
watch(() => route.path, () => {
  // Reset values immediately for better UX
  readingTime.value = 0
  wordCount.value = 0
  calculateReadingTime()
})
</script>

<template>
  <div v-if="readingTime > 0" class="reading-time" :title="`${wordCount.toLocaleString()} words`">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
    <span>{{ readingTime }} min read</span>
  </div>
</template>
