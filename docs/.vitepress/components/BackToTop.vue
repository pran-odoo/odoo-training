<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isVisible = ref(false)

function handleScroll() {
  isVisible.value = window.scrollY > 500
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <Teleport to="body">
    <button
      v-show="isVisible"
      class="back-to-top"
      @click="scrollToTop"
      aria-label="Back to top"
      title="Back to top"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 15l-6-6-6 6"/>
      </svg>
    </button>
  </Teleport>
</template>

<style scoped>
.back-to-top {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  z-index: 50;
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.3s ease forwards;
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.back-to-top:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  background: var(--vp-c-brand-2);
}

.back-to-top:active {
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .back-to-top {
    bottom: 16px;
    right: 16px;
    width: 40px;
    height: 40px;
  }
}
</style>
