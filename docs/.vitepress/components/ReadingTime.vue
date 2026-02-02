<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()
const readingTime = ref(0)
const wordCount = ref(0)

// Average reading speed (words per minute)
const WORDS_PER_MINUTE = 200

function calculateReadingTime() {
  // Wait for content to be rendered
  setTimeout(() => {
    const content = document.querySelector('.vp-doc')
    if (!content) return

    // Get text content, excluding code blocks for more accurate estimation
    const text = content.textContent || ''
    const words = text.trim().split(/\s+/).filter(word => word.length > 0).length

    wordCount.value = words
    readingTime.value = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
  }, 100)
}

onMounted(() => {
  calculateReadingTime()
})

// Recalculate when route changes
watch(() => route.path, () => {
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
