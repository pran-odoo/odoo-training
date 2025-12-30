<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vitepress'
import { safeGetItem, safeSetItem, STORAGE_KEYS } from '../utils/localStorage'

const route = useRoute()
const router = useRouter()

const isVisible = ref(false)
const savedPath = ref('')
const savedTitle = ref('')
const savedScroll = ref(0)

interface ReadingProgress {
  path: string
  title: string
  scrollY: number
  timestamp: number
}

function saveProgress() {
  const progress: ReadingProgress = {
    path: route.path,
    title: document.title.replace(' | Odoo Training', ''),
    scrollY: window.scrollY,
    timestamp: Date.now()
  }
  safeSetItem(STORAGE_KEYS.lastSection, JSON.stringify(progress))
}

function loadProgress() {
  const saved = safeGetItem(STORAGE_KEYS.lastSection)
  if (!saved) return

  try {
    const progress: ReadingProgress = JSON.parse(saved)

    // Only show if different page and scrolled past intro
    if (progress.path !== route.path && progress.scrollY > 300) {
      // Check if not too old (24 hours)
      const hoursSinceLastVisit = (Date.now() - progress.timestamp) / (1000 * 60 * 60)
      if (hoursSinceLastVisit < 24) {
        savedPath.value = progress.path
        savedTitle.value = progress.title
        savedScroll.value = progress.scrollY
        isVisible.value = true
      }
    }
  } catch (e) {
    // Invalid data
  }
}

function resumeReading() {
  // Fix: Use direct navigation instead of router.go() which takes a delta number, not a path
  dismiss()
  // Navigate and scroll after page loads
  window.location.href = savedPath.value
}

function dismiss() {
  isVisible.value = false
}

// Save progress periodically while scrolling
let saveTimeout: number | null = null
function handleScroll() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = window.setTimeout(saveProgress, 1000)
}

onMounted(() => {
  // Load saved progress after a delay
  setTimeout(loadProgress, 500)

  // Save progress on scroll
  window.addEventListener('scroll', handleScroll, { passive: true })

  // Save on page leave
  window.addEventListener('beforeunload', saveProgress)
})

onUnmounted(() => {
  // Cleanup timeout and event listeners
  if (saveTimeout) clearTimeout(saveTimeout)
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('beforeunload', saveProgress)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="slide">
      <div v-if="isVisible" class="resume-banner">
        <div class="resume-content">
          <span class="resume-icon">📖</span>
          <div class="resume-text">
            <span class="resume-label">Continue reading</span>
            <span class="resume-title">{{ savedTitle }}</span>
          </div>
        </div>
        <div class="resume-actions">
          <button class="resume-btn" @click="resumeReading">
            Resume
          </button>
          <button class="dismiss-btn" @click="dismiss" aria-label="Dismiss">
            ×
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.resume-banner {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  z-index: 100;
  max-width: 90vw;
}

.resume-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.resume-icon {
  font-size: 24px;
}

.resume-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.resume-label {
  font-size: 12px;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.resume-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resume-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.resume-btn {
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.resume-btn:hover {
  background: var(--vp-c-brand-2);
}

.dismiss-btn {
  background: transparent;
  border: none;
  font-size: 20px;
  color: var(--vp-c-text-3);
  cursor: pointer;
  padding: 4px 8px;
  line-height: 1;
}

.dismiss-btn:hover {
  color: var(--vp-c-text-1);
}

/* Transition */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

@media (max-width: 640px) {
  .resume-banner {
    bottom: 70px;
    left: 16px;
    right: 16px;
    transform: none;
    max-width: none;
  }

  .slide-enter-from,
  .slide-leave-to {
    transform: translateY(20px);
  }
}
</style>
