<script setup lang="ts">
import { useBookmarks } from '../composables/useBookmarks'
import { useRouter } from 'vitepress'

const { bookmarks, removeBookmark, clearBookmarks } = useBookmarks()
const router = useRouter()

function navigateTo(path: string) {
  // Fix: Use direct navigation instead of router.go() which takes a delta number
  window.location.href = path
}

function getPageTitle(path: string): string {
  // Extract title from path
  const name = path.replace(/^\//, '').replace(/\.html$/, '').replace(/-/g, ' ')
  return name.charAt(0).toUpperCase() + name.slice(1) || 'Home'
}
</script>

<template>
  <div class="bookmarks-panel" v-if="bookmarks.length > 0">
    <div class="bookmarks-header">
      <span class="bookmarks-title">Bookmarks</span>
      <button class="bookmarks-clear" @click="clearBookmarks" title="Clear all bookmarks">
        Clear
      </button>
    </div>
    <ul class="bookmarks-list">
      <li v-for="path in bookmarks" :key="path" class="bookmark-item">
        <a :href="path" @click.prevent="navigateTo(path)">
          {{ getPageTitle(path) }}
        </a>
        <button class="bookmark-remove" @click="removeBookmark(path)" title="Remove bookmark">
          ×
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.bookmarks-panel {
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.bookmarks-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.bookmarks-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--vp-c-text-2);
}

.bookmarks-clear {
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.bookmarks-clear:hover {
  border-color: var(--vp-c-danger-1);
  color: var(--vp-c-danger-1);
}

.bookmarks-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.bookmark-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
}

.bookmark-item a {
  flex: 1;
  color: var(--vp-c-text-1);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.bookmark-item a:hover {
  color: var(--vp-c-brand-1);
}

.bookmark-remove {
  background: transparent;
  border: none;
  color: var(--vp-c-text-3);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.bookmark-item:hover .bookmark-remove {
  opacity: 1;
}

.bookmark-remove:hover {
  color: var(--vp-c-danger-1);
}
</style>
