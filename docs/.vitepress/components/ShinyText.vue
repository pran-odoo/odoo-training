<script setup lang="ts">
/**
 * ShinyText - Premium animated gradient text effect
 * A Vue 3 port of react-bits/ShinyText with full animation control
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

interface Props {
  text?: string
  disabled?: boolean
  speed?: number // seconds for one complete animation
  color?: string
  shineColor?: string
  spread?: number // gradient angle in degrees
  yoyo?: boolean // bounce back and forth
  pauseOnHover?: boolean
  direction?: 'left' | 'right'
  delay?: number // seconds to pause between animations
  tag?: string // HTML tag to render (span, h1, h2, etc.)
}

const props = withDefaults(defineProps<Props>(), {
  text: '',
  disabled: false,
  speed: 2,
  color: '#b5b5b5',
  shineColor: '#ffffff',
  spread: 120,
  yoyo: false,
  pauseOnHover: false,
  direction: 'left',
  delay: 0,
  tag: 'span'
})

const isPaused = ref(false)
const progress = ref(0)
let animationFrameId: number | null = null
let lastTime: number | null = null
let elapsed = 0
let directionMultiplier = props.direction === 'left' ? 1 : -1

const animationDuration = computed(() => props.speed * 1000)
const delayDuration = computed(() => props.delay * 1000)

// Gradient background style
const gradientStyle = computed(() => ({
  backgroundImage: `linear-gradient(${props.spread}deg, ${props.color} 0%, ${props.color} 35%, ${props.shineColor} 50%, ${props.color} 65%, ${props.color} 100%)`,
  backgroundSize: '200% auto',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  // Transform: p=0 -> 150% (shine off right), p=100 -> -50% (shine off left)
  backgroundPosition: `${150 - progress.value * 2}% center`
}))

function animate(time: number) {
  if (props.disabled || isPaused.value) {
    lastTime = null
    animationFrameId = requestAnimationFrame(animate)
    return
  }

  if (lastTime === null) {
    lastTime = time
    animationFrameId = requestAnimationFrame(animate)
    return
  }

  const deltaTime = time - lastTime
  lastTime = time
  elapsed += deltaTime

  const duration = animationDuration.value
  const delayMs = delayDuration.value

  if (props.yoyo) {
    const cycleDuration = duration + delayMs
    const fullCycle = cycleDuration * 2
    const cycleTime = elapsed % fullCycle

    if (cycleTime < duration) {
      // Forward animation: 0 -> 100
      const p = (cycleTime / duration) * 100
      progress.value = directionMultiplier === 1 ? p : 100 - p
    } else if (cycleTime < cycleDuration) {
      // Delay at end
      progress.value = directionMultiplier === 1 ? 100 : 0
    } else if (cycleTime < cycleDuration + duration) {
      // Reverse animation: 100 -> 0
      const reverseTime = cycleTime - cycleDuration
      const p = 100 - (reverseTime / duration) * 100
      progress.value = directionMultiplier === 1 ? p : 100 - p
    } else {
      // Delay at start
      progress.value = directionMultiplier === 1 ? 0 : 100
    }
  } else {
    const cycleDuration = duration + delayMs
    const cycleTime = elapsed % cycleDuration

    if (cycleTime < duration) {
      // Animation phase: 0 -> 100
      const p = (cycleTime / duration) * 100
      progress.value = directionMultiplier === 1 ? p : 100 - p
    } else {
      // Delay phase - hold at end (shine off-screen)
      progress.value = directionMultiplier === 1 ? 100 : 0
    }
  }

  animationFrameId = requestAnimationFrame(animate)
}

// Watch for direction changes
watch(() => props.direction, (newDir) => {
  directionMultiplier = newDir === 'left' ? 1 : -1
  elapsed = 0
  progress.value = 0
})

function handleMouseEnter() {
  if (props.pauseOnHover) {
    isPaused.value = true
  }
}

function handleMouseLeave() {
  if (props.pauseOnHover) {
    isPaused.value = false
  }
}

onMounted(() => {
  if (!props.disabled) {
    animationFrameId = requestAnimationFrame(animate)
  }
})

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
})

// Watch disabled state
watch(() => props.disabled, (disabled) => {
  if (!disabled && animationFrameId === null) {
    animationFrameId = requestAnimationFrame(animate)
  }
})
</script>

<template>
  <component
    :is="tag"
    class="shiny-text"
    :style="gradientStyle"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <slot>{{ text }}</slot>
  </component>
</template>

<style scoped>
.shiny-text {
  display: inline-block;
  transition: opacity 0.2s ease;
}

.shiny-text:hover {
  opacity: 0.95;
}
</style>
