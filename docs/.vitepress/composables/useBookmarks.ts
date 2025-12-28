import { ref, computed } from 'vue'
import { safeGetItem, safeSetItem, STORAGE_KEYS } from '../utils/localStorage'

const bookmarks = ref<string[]>([])

// Load bookmarks from localStorage
function loadBookmarks(): void {
  const saved = safeGetItem(STORAGE_KEYS.bookmarks)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        bookmarks.value = parsed.filter(id => typeof id === 'string')
      }
    } catch (e) {
      bookmarks.value = []
    }
  }
}

// Save bookmarks to localStorage
function saveBookmarks(): void {
  safeSetItem(STORAGE_KEYS.bookmarks, JSON.stringify(bookmarks.value))
}

// Check if a page is bookmarked
function isBookmarked(path: string): boolean {
  return bookmarks.value.includes(path)
}

// Toggle bookmark for a page
function toggleBookmark(path: string): void {
  if (isBookmarked(path)) {
    bookmarks.value = bookmarks.value.filter(p => p !== path)
  } else {
    bookmarks.value = [...bookmarks.value, path]
  }
  saveBookmarks()
}

// Add a bookmark
function addBookmark(path: string): void {
  if (!isBookmarked(path)) {
    bookmarks.value = [...bookmarks.value, path]
    saveBookmarks()
  }
}

// Remove a bookmark
function removeBookmark(path: string): void {
  bookmarks.value = bookmarks.value.filter(p => p !== path)
  saveBookmarks()
}

// Clear all bookmarks
function clearBookmarks(): void {
  bookmarks.value = []
  saveBookmarks()
}

// Initialize on first use
let initialized = false

export function useBookmarks() {
  if (!initialized && typeof window !== 'undefined') {
    loadBookmarks()
    initialized = true
  }

  return {
    bookmarks: computed(() => bookmarks.value),
    isBookmarked,
    toggleBookmark,
    addBookmark,
    removeBookmark,
    clearBookmarks
  }
}
