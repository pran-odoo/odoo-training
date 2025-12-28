<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const progress = ref(0)

function updateProgress() {
  const scrollTop = window.scrollY
  const docHeight = document.documentElement.scrollHeight - window.innerHeight
  if (docHeight > 0) {
    progress.value = Math.min(100, Math.max(0, (scrollTop / docHeight) * 100))
  }
}

onMounted(() => {
  window.addEventListener('scroll', updateProgress, { passive: true })
  updateProgress()
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateProgress)
})
</script>

<template>
  <div class="progress-container">
    <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
  </div>
</template>

<style scoped>
.progress-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: transparent;
  z-index: 1000;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--vp-c-brand-1), var(--vp-c-brand-3));
  transition: width 0.1s ease-out;
}
</style>
