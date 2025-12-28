<script setup lang="ts">
import { computed } from 'vue'
import { useSearchHighlights } from '../composables/useSearchHighlights'
import { usePersonalization } from '../composables/usePersonalization'

const { totalCount, currentIndex, nextHighlight, prevHighlight } = useSearchHighlights()
const { settings } = usePersonalization()

const isVisible = computed(() => totalCount.value > 0 && settings.inPageHighlights)
const displayIndex = computed(() => currentIndex.value >= 0 ? currentIndex.value + 1 : 1)
</script>

<template>
  <Teleport to="body">
    <div v-if="isVisible" class="search-highlights-controls">
      <span class="highlights-count">{{ displayIndex }} of {{ totalCount }}</span>
      <div class="highlights-nav">
        <button
          class="highlights-btn"
          @click="prevHighlight"
          :disabled="totalCount < 2"
          aria-label="Previous match"
        >
          ↑
        </button>
        <button
          class="highlights-btn"
          @click="nextHighlight"
          :disabled="totalCount < 2"
          aria-label="Next match"
        >
          ↓
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.search-highlights-controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.highlights-count {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.highlights-nav {
  display: flex;
  gap: 4px;
}

.highlights-btn {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.highlights-btn:hover:not(:disabled) {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
}

.highlights-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
