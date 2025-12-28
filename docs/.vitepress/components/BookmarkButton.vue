<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { useBookmarks } from '../composables/useBookmarks'

const { page } = useData()
const { isBookmarked, toggleBookmark } = useBookmarks()

const currentPath = computed(() => page.value.relativePath.replace(/\.md$/, ''))
const bookmarked = computed(() => isBookmarked(currentPath.value))

function handleClick() {
  toggleBookmark(currentPath.value)
}
</script>

<template>
  <button
    class="bookmark-btn"
    :class="{ bookmarked }"
    @click="handleClick"
    :aria-pressed="bookmarked"
    :title="bookmarked ? 'Remove bookmark' : 'Bookmark this page'"
  >
    {{ bookmarked ? '★' : '☆' }}
  </button>
</template>

<style scoped>
.bookmark-btn {
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  font-size: 18px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1;
}

.bookmark-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.bookmark-btn.bookmarked {
  background: var(--vp-c-warning-soft);
  border-color: var(--vp-c-warning-1);
  color: var(--vp-c-warning-1);
}
</style>
