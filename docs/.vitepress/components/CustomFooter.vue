<script setup lang="ts">
/**
 * Custom Footer with Scrambled Text Effect
 */
import { ref, onMounted, onUnmounted } from 'vue'

const message = 'Made with love for the Odoo Community'
const author = 'Created by Anshuman Priyadarshi'

const displayMessage = ref(message)
const displayAuthor = ref(author)

const scrambleChars = '!@#$%^&*<>[]{}|;:,.?/~`'
let messageAnimating = false
let authorAnimating = false

function scrambleText(
  original: string,
  displayRef: { value: string },
  duration: number,
  flagSetter: (v: boolean) => void
) {
  flagSetter(true)
  const startTime = Date.now()

  function animate() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)

    let result = ''
    for (let i = 0; i < original.length; i++) {
      if (original[i] === ' ') {
        result += ' '
      } else if (progress * original.length > i) {
        result += original[i]
      } else {
        result += scrambleChars[Math.floor(Math.random() * scrambleChars.length)]
      }
    }

    displayRef.value = result

    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {
      displayRef.value = original
      flagSetter(false)
    }
  }

  animate()
}

function handleMessageHover() {
  if (!messageAnimating) {
    scrambleText(message, displayMessage, 800, (v) => messageAnimating = v)
  }
}

function handleAuthorHover() {
  if (!authorAnimating) {
    scrambleText(author, displayAuthor, 600, (v) => authorAnimating = v)
  }
}

onMounted(() => {
  displayMessage.value = message
  displayAuthor.value = author
})
</script>

<template>
  <footer class="custom-footer">
    <div class="footer-content">
      <p
        class="footer-message"
        @mouseenter="handleMessageHover"
      >
        <span class="heart">❤️</span>
        {{ displayMessage }}
      </p>
      <p
        class="footer-author"
        @mouseenter="handleAuthorHover"
      >
        {{ displayAuthor }}
      </p>
    </div>
  </footer>
</template>

<style scoped>
.custom-footer {
  border-top: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg-soft);
  padding: 24px;
  text-align: center;
  position: relative;
  z-index: 1;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
}

.footer-message {
  font-size: 14px;
  color: var(--vp-c-text-2);
  margin: 0 0 8px 0;
  font-family: 'SF Mono', 'Fira Code', 'Monaco', 'Consolas', monospace;
  cursor: default;
  transition: color 0.3s ease;
}

.footer-message:hover {
  color: var(--vp-c-brand-1);
}

.heart {
  display: inline-block;
  margin-right: 4px;
  animation: heartbeat 1.2s ease-in-out infinite;
  font-style: normal;
}

@keyframes heartbeat {
  0%, 100% {
    transform: scale(1);
    filter: brightness(1);
  }
  15% {
    transform: scale(1.25);
    filter: brightness(1.2);
  }
  30% {
    transform: scale(1);
    filter: brightness(1);
  }
  45% {
    transform: scale(1.25);
    filter: brightness(1.2);
  }
  60%, 100% {
    transform: scale(1);
    filter: brightness(1);
  }
}

.footer-author {
  font-size: 13px;
  color: var(--vp-c-text-3);
  margin: 0;
  font-family: 'SF Mono', 'Fira Code', 'Monaco', 'Consolas', monospace;
  cursor: default;
  transition: color 0.3s ease;
}

.footer-author:hover {
  color: var(--vp-c-brand-1);
}

/* Focus mode hides footer */
body.focus-mode .custom-footer {
  display: none;
}
</style>
