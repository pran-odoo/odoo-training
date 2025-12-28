<script setup lang="ts">
/**
 * Scrambled Text Effect
 * Text scrambles when hovered - pure Vue/CSS implementation
 */
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  text: string
  scrambleChars?: string
  duration?: number
  className?: string
}>(), {
  scrambleChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  duration: 1000,
  className: ''
})

const displayText = ref(props.text)
const containerRef = ref<HTMLElement | null>(null)
let isAnimating = false
let animationFrame: number | null = null

function scramble() {
  if (isAnimating) return
  isAnimating = true

  const originalText = props.text
  const chars = props.scrambleChars
  const duration = props.duration
  const startTime = Date.now()
  const iterations = originalText.length

  function animate() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)

    let result = ''
    for (let i = 0; i < originalText.length; i++) {
      if (originalText[i] === ' ') {
        result += ' '
      } else if (progress * iterations > i) {
        result += originalText[i]
      } else {
        result += chars[Math.floor(Math.random() * chars.length)]
      }
    }

    displayText.value = result

    if (progress < 1) {
      animationFrame = requestAnimationFrame(animate)
    } else {
      displayText.value = originalText
      isAnimating = false
    }
  }

  animate()
}

function handleMouseEnter() {
  scramble()
}

onMounted(() => {
  displayText.value = props.text
})

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
})
</script>

<template>
  <span
    ref="containerRef"
    :class="['scrambled-text', className]"
    @mouseenter="handleMouseEnter"
  >{{ displayText }}</span>
</template>

<style scoped>
.scrambled-text {
  font-family: 'SF Mono', 'Fira Code', 'Monaco', 'Consolas', monospace;
  cursor: default;
  display: inline-block;
}
</style>
